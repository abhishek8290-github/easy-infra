const { runDockerOnEc2WithDomainConnect } =  require('./infra/runDockerWithDomain')


const main = async () =>{
  const DOMAIN = "nishant.abhi8290.in";
  const DOCKER_FILE_ADDRESS =  "471112813548.dkr.ecr.us-west-2.amazonaws.com/streamlit-app:latest";
  const DOCKER_PORT = 8501;
  const DOMAIN_USER_EMAIL = "abhishek8290@gmail.com";
  await runDockerOnEc2WithDomainConnect(DOMAIN, DOCKER_FILE_ADDRESS, DOCKER_PORT, DOMAIN_USER_EMAIL) ;

}

main()



