/**
 * JSON Database Utility
 * Lightweight file-based database using JSON files
 */

const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

/**
 * Ensure data directory exists
 */
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') throw err;
    }
}

/**
 * Read data from a JSON file
 * @param {string} filename - Name of the JSON file
 * @param {any} defaultValue - Default value if file doesn't exist (defaults to empty array)
 * @returns {Promise<any>} Parsed JSON data
 */
async function readData(filename, defaultValue = []) {
    await ensureDataDir();
    const filepath = path.join(DATA_DIR, filename);
    
    try {
        const data = await fs.readFile(filepath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') {
            // File doesn't exist, return default value
            return defaultValue;
        }
        throw err;
    }
}

/**
 * Write data to a JSON file
 * @param {string} filename - Name of the JSON file
 * @param {any} data - Data to write
 */
async function writeData(filename, data) {
    await ensureDataDir();
    const filepath = path.join(DATA_DIR, filename);
    await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Append item to a JSON array file
 * @param {string} filename - Name of the JSON file
 * @param {any} item - Item to append
 */
async function appendData(filename, item) {
    const data = await readData(filename);
    if (!Array.isArray(data)) {
        throw new Error(`${filename} does not contain an array`);
    }
    data.push(item);
    await writeData(filename, data);
    return data;
}

/**
 * Update item in a JSON array file by ID
 * @param {string} filename - Name of the JSON file
 * @param {string} id - Item ID
 * @param {object} updates - Updates to apply
 */
async function updateData(filename, id, updates) {
    const data = await readData(filename);
    if (!Array.isArray(data)) {
        throw new Error(`${filename} does not contain an array`);
    }
    
    const index = data.findIndex(item => item.id === id);
    if (index === -1) {
        return null;
    }
    
    data[index] = { ...data[index], ...updates };
    await writeData(filename, data);
    return data[index];
}

/**
 * Delete item from a JSON array file by ID
 * @param {string} filename - Name of the JSON file
 * @param {string} id - Item ID
 */
async function deleteData(filename, id) {
    const data = await readData(filename);
    if (!Array.isArray(data)) {
        throw new Error(`${filename} does not contain an array`);
    }
    
    const index = data.findIndex(item => item.id === id);
    if (index === -1) {
        return false;
    }
    
    data.splice(index, 1);
    await writeData(filename, data);
    return true;
}

/**
 * Find item in a JSON array file by ID
 * @param {string} filename - Name of the JSON file
 * @param {string} id - Item ID
 */
async function findById(filename, id) {
    const data = await readData(filename);
    if (!Array.isArray(data)) {
        throw new Error(`${filename} does not contain an array`);
    }
    return data.find(item => item.id === id) || null;
}

module.exports = {
    readData,
    writeData,
    appendData,
    updateData,
    deleteData,
    findById,
    DATA_DIR
};
