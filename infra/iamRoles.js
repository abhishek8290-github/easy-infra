const aws = require("@pulumi/aws");

/**
 * Creates or reuses an IAM role and instance profile for EC2 to access ECR.
 *
 * @returns {Promise<{ ec2Role: aws.iam.Role, instanceProfile: aws.iam.InstanceProfile }>}
 */
async function createOrGetIamForEcr() {
    let ec2Role;
    const ROLE_NAME = "EC2_DOCKER_ROLE";
    const INSTANCE_PROFILE_NAME = "EC2_DOCKER_ROLE_INSTANCE_PROFILE";
    try {
        const existingRole = await aws.iam.getRole({ name: ROLE_NAME });
        ec2Role = aws.iam.Role.get(ROLE_NAME, existingRole.name);
        
    } catch {
        ec2Role = new aws.iam.Role(ROLE_NAME, {
            name: ROLE_NAME,
            assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
                Service: "ec2.amazonaws.com",
            }),
        });

        // Attach policies
        new aws.iam.RolePolicyAttachment("ecr-access", {
            role: ec2Role.name,
            policyArn: "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
        });

        new aws.iam.RolePolicyAttachment("ecr-pull", {
            role: ec2Role.name,
            policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
        });

        
    }

    let instanceProfile;
    
    try {
        const existingProfile = await aws.iam.getInstanceProfile({ name: INSTANCE_PROFILE_NAME });
        instanceProfile = aws.iam.InstanceProfile.get(INSTANCE_PROFILE_NAME, existingProfile.name);
        console.log("✅ Reusing existing Instance Profile: test-ec2-instance-profile");
    } catch {
        instanceProfile = new aws.iam.InstanceProfile(INSTANCE_PROFILE_NAME, {
            name: INSTANCE_PROFILE_NAME,
            role: ec2Role.name,
        });

        console.log("🆕 Created IAM Instance Profile.");
    }

    return { ec2Role, instanceProfile };
}


module.exports = { createOrGetIamForEcr };
