/**
 * JSON Storage Layer for AnomHome Overmind
 * 
 * Provides simple file-based JSON storage with atomic writes
 * and caching for better performance.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

// In-memory cache for data
const cache = new Map();

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
 * Get the file path for a data collection
 * @param {string} collection - Collection name (e.g., 'links', 'uploads')
 * @returns {string} Full file path
 */
function getFilePath(collection) {
    // Sanitize collection name to prevent path traversal
    const safeName = collection.replace(/[^a-zA-Z0-9_-]/g, '');
    return path.join(DATA_DIR, `${safeName}.json`);
}

/**
 * Read data from a JSON file
 * @param {string} collection - Collection name
 * @returns {Promise<Array>} Array of items
 */
async function read(collection) {
    const filePath = getFilePath(collection);
    
    // Check cache first
    if (cache.has(collection)) {
        return cache.get(collection);
    }
    
    try {
        const data = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(data);
        cache.set(collection, parsed);
        return parsed;
    } catch (err) {
        if (err.code === 'ENOENT') {
            // File doesn't exist, return empty array
            return [];
        }
        if (err instanceof SyntaxError) {
            // Invalid JSON - log error and return empty array to prevent crash
            console.error(`Invalid JSON in ${collection}.json, resetting to empty array:`, err.message);
            return [];
        }
        throw err;
    }
}

/**
 * Write data to a JSON file (atomic write)
 * @param {string} collection - Collection name
 * @param {Array} data - Array of items to write
 */
async function write(collection, data) {
    await ensureDataDir();
    const filePath = getFilePath(collection);
    const tempPath = `${filePath}.tmp`;
    
    // Write to temp file first, then rename (atomic)
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tempPath, filePath);
    
    // Update cache
    cache.set(collection, data);
}

/**
 * Find an item by a field value
 * @param {string} collection - Collection name
 * @param {string} field - Field to search
 * @param {*} value - Value to match
 * @returns {Promise<Object|null>} Found item or null
 */
async function findOne(collection, field, value) {
    const data = await read(collection);
    return data.find(item => item[field] === value) || null;
}

/**
 * Find all items matching a condition
 * @param {string} collection - Collection name
 * @param {Function} predicate - Filter function
 * @returns {Promise<Array>} Matching items
 */
async function findAll(collection, predicate = () => true) {
    const data = await read(collection);
    return data.filter(predicate);
}

/**
 * Insert a new item
 * @param {string} collection - Collection name
 * @param {Object} item - Item to insert
 * @returns {Promise<Object>} Inserted item
 */
async function insert(collection, item) {
    const data = await read(collection);
    data.push(item);
    await write(collection, data);
    return item;
}

/**
 * Update an item by a field value
 * @param {string} collection - Collection name
 * @param {string} field - Field to match
 * @param {*} value - Value to match
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} Updated item or null
 */
async function update(collection, field, value, updates) {
    const data = await read(collection);
    const index = data.findIndex(item => item[field] === value);
    
    if (index === -1) return null;
    
    data[index] = { ...data[index], ...updates };
    await write(collection, data);
    return data[index];
}

/**
 * Delete an item by a field value
 * @param {string} collection - Collection name
 * @param {string} field - Field to match
 * @param {*} value - Value to match
 * @returns {Promise<boolean>} True if deleted
 */
async function remove(collection, field, value) {
    const data = await read(collection);
    const index = data.findIndex(item => item[field] === value);
    
    if (index === -1) return false;
    
    data.splice(index, 1);
    await write(collection, data);
    return true;
}

/**
 * Delete multiple items matching a condition
 * @param {string} collection - Collection name
 * @param {Function} predicate - Filter function for items to delete
 * @returns {Promise<number>} Number of items deleted
 */
async function removeWhere(collection, predicate) {
    const data = await read(collection);
    const originalLength = data.length;
    const filtered = data.filter(item => !predicate(item));
    
    if (filtered.length !== originalLength) {
        await write(collection, filtered);
    }
    
    return originalLength - filtered.length;
}

/**
 * Clear the cache for a collection (or all collections)
 * @param {string} [collection] - Collection name (optional)
 */
function clearCache(collection) {
    if (collection) {
        cache.delete(collection);
    } else {
        cache.clear();
    }
}

export default {
    read,
    write,
    findOne,
    findAll,
    insert,
    update,
    remove,
    removeWhere,
    clearCache,
    DATA_DIR
};
