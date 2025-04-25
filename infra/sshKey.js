const aws = require("@pulumi/aws");
const crypto = require("crypto");
const sshpk = require("sshpk");
const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * Creates a new EC2 Key Pair and saves it locally.
 *
 * @returns {Promise<{ keyPair: aws.ec2.KeyPair, privateKey: string }>}
 */
async function createEc2KeyPair(keyName = "streamlit-keypair") {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "pkcs1", format: "pem" },
        privateKeyEncoding: { type: "pkcs1", format: "pem" },
    });

    const sshPublicKey = sshpk.parseKey(publicKey, "pem").toString("ssh");

    // Save keys to .ssh directory
    const sshDir = path.join(os.homedir(), '.ssh');
    const privateKeyPath = path.join(sshDir, `${keyName}.pem`);
    const publicKeyPath = path.join(sshDir, `${keyName}.pub`);

    // Create .ssh directory if it doesn't exist
    if (!fs.existsSync(sshDir)) {
        fs.mkdirSync(sshDir, { recursive: true });
    }

    // Save private key with restricted permissions (600)
    fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
    // Save public key
    fs.writeFileSync(publicKeyPath, sshPublicKey);

    console.log(`✅ Saved private key to: ${privateKeyPath}`);
    console.log(`✅ Saved public key to: ${publicKeyPath}`);

    // Create new key pair in AWS
    const keyPair = new aws.ec2.KeyPair(keyName, {
        publicKey: sshPublicKey,
    });

    console.log(`🆕 Created new Key Pair in AWS: ${keyName}`);

    return { keyPair, privateKey };
}

module.exports = { createEc2KeyPair };
