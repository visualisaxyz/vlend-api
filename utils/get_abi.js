const fs = require('fs');
const path = require('path');

async function getAbi(filename, chain) {
  if (!chain) {
    throw new Error('Chain parameter is required');
  }

  try {
    const filePath = path.join(
      __dirname,
      `../data/abis/${chain}/${filename}.json`
    );
    console.log('Debug - Loading ABI from:', filePath);

    const fileContent = fs.readFileSync(filePath);
    const jsonContent = JSON.parse(fileContent);
    if (!jsonContent.abi || !Array.isArray(jsonContent.abi)) {
      console.error('ABI is not defined or not an array');
      return;
    }
    return {
      address: jsonContent.address,
      abi: jsonContent.abi
    };
  } catch (error) {
    console.error('Error loading ABI:', {
      filename,
      chain,
      error: error.message
    });
    return {};
  }
}

module.exports = getAbi;
