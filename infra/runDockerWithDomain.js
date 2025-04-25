const aws = require('@pulumi/aws')
const fs = require('fs');
const path = require('path');
const os = require('os');

const { createOrGetIamForEcr } = require('./iamRoles')


const runDockerOnEc2WithDomainConnect = async ( DOMAIN,DOCKER_FILE_ADDRESS, DOCKER_PORT, DOMAIN_USER_EMAIL ) => {
  
    const {  instanceProfile } = await createOrGetIamForEcr()
      
    const privateKey = fs.readFileSync(path.join(os.homedir(), '.ssh', 'streamlitkey.pem'), 'utf8');
    
    const publicKey = fs.readFileSync(path.join(os.homedir(), '.ssh', 'streamlitkey.pub'), 'utf8');
    
    // Create a new key pair in AWS
    const keyPair = new aws.ec2.KeyPair("streamlitkey", {
        publicKey: publicKey,
        keyName: "streamlitkey"
    });
  
    const secGroup = new aws.ec2.SecurityGroup('streamlit-sg', {
      description: 'Allow SSH, HTTP, HTTPS',
      ingress: [
        { protocol: 'tcp', fromPort: 22, toPort: 22, cidrBlocks: ['0.0.0.0/0'] },
        { protocol: 'tcp', fromPort: 80, toPort: 80, cidrBlocks: ['0.0.0.0/0'] },
        {
          protocol: 'tcp',
          fromPort: 443,
          toPort: 443,
          cidrBlocks: ['0.0.0.0/0'],
        },
      ],
      egress: [
        { protocol: '-1', fromPort: 0, toPort: 0, cidrBlocks: ['0.0.0.0/0'] },
      ],
    })
  
  
  const zone = aws.route53.getZone({ name: "abhi8290.in" });
  
  const server = new aws.ec2.Instance("example", {
    ami: "ami-002f6e91abff6eb96",
    instanceType: aws.ec2.InstanceType.T2_Micro,
    keyName: keyPair.keyName,
    vpcSecurityGroupIds: [secGroup.id],
    associatePublicIpAddress: true,
    iamInstanceProfile: instanceProfile.name,
    userData: `#!/bin/bash
    # Log everything
    exec > /var/log/user-data.log 2>&1
    
    # Update the system
    sudo yum update -y
  
    sudo yum install -y epel-release
    
    # Install Docker, Nginx, Certbot and other necessary packages
    sudo yum install -y docker wget unzip nginx certbot python3-certbot-nginx
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo systemctl start nginx
    sudo systemctl enable nginx
    sudo usermod -aG docker ec2-user
  
    # Install AWS CLI v2
    yum install -y aws-cli
    
    # Configure Nginx - start with HTTP only
    cat > /etc/nginx/conf.d/streamlit.conf << 'EOL'
  server {
    listen 80;
    server_name ${DOMAIN};
  
    location / {
        proxy_pass http://localhost:${DOCKER_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
  }
  EOL
  
    # Test and restart Nginx
    sudo nginx -t && sudo systemctl restart nginx
  
    
    # Wait for DNS to propagate before running 
    for i in {1..10}; do
      if host ${DOMAIN}; then
        echo "✅ DNS resolved!"
        break
      fi
      echo "⏳ Waiting for DNS to propagate..."
      sleep 15
    done
  
  
    # Login to ECR
    aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin 471112813548.dkr.ecr.us-west-2.amazonaws.com
    
    # Pull and run the Docker image with restart policy
    docker pull ${DOCKER_FILE_ADDRESS}
    docker run -d --restart unless-stopped -p ${DOCKER_PORT}:${DOCKER_PORT} ${DOCKER_FILE_ADDRESS}
    
    # Get SSL certificate after DNS propagation
    sudo certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email ${DOMAIN_USER_EMAIL} --redirect
  
    `,
    tags: {
        Name: "example-instance",
    },
  });
  
  const record = new aws.route53.Record("streamlit-record", {
      zoneId: zone.then(zone => zone.zoneId),
      name: `${DOMAIN}`,
      type: "A",
      ttl: 300,
      records: [server.publicIp],
  });
  
  // exports.publicIp = server.publicIp;
  // exports.publicDns = server.publicDns;
  // exports.domain = record.fqdn;
  // exports.privateKey = pulumi.output(privateKey);
  
  }


  module.exports = { runDockerOnEc2WithDomainConnect };


  


  