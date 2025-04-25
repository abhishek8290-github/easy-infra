const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const docker = require("@pulumi/docker");

/**
 * Builds and pushes a Docker image to ECR.
 *
 * @param {string} repoName - Name of the ECR repo
 * @param {string} path - Path to Docker context (default: ./)
 * @returns {docker.Image} - Docker image resource
 */
function createDockerImage(repoName, path = "./") {
    if (!repoName) {
        throw new Error("repoName is required for createDockerImage");
    }

    const ecrRepo = new aws.ecr.Repository(repoName);

    const image = new docker.Image(`${repoName}-image`, {
        imageName: pulumi.interpolate`${ecrRepo.repositoryUrl}:latest`,
        build: path,
        registry: ecrRepo.registryId.apply(async (registryId) => {
            const creds = await aws.ecr.getCredentials({ registryId });
            const decoded = Buffer.from(creds.authorizationToken, "base64").toString();
            const [username, password] = decoded.split(":");
            return {
                server: creds.proxyEndpoint,
                username,
                password,
            };
        }),
    });

    return image;
}

/**
 * Pushes an existing Docker image to ECR.
 *
 * @param {string} repoName - Name of the ECR repo
 * @param {string} localImageName - Name of the local Docker image
 * @returns {docker.Image} - Docker image resource
 */
function pushExistingDockerImage(repoName, localImageName) {
    if (!repoName) {
        throw new Error("repoName is required for pushExistingDockerImage");
    }
    
    if (!localImageName) {
        throw new Error("localImageName is required for pushExistingDockerImage");
    }

    const ecrRepo = new aws.ecr.Repository(repoName);

    const image = new docker.Image(`${repoName}-image`, {
        imageName: pulumi.interpolate`${ecrRepo.repositoryUrl}:latest`,
        build: false,
        localImageName: localImageName,
        registry: ecrRepo.registryId.apply(async (registryId) => {
            const creds = await aws.ecr.getCredentials({ registryId });
            const decoded = Buffer.from(creds.authorizationToken, "base64").toString();
            const [username, password] = decoded.split(":");
            return {
                server: creds.proxyEndpoint,
                username,
                password,
            };
        }),
    });

    return image;
}

module.exports = { createDockerImage, pushExistingDockerImage };
