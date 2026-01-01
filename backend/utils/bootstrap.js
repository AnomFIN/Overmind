/**
 * Bootstrap Script
 * Initializes admin user and default personas on first run
 */

const JsonStorageAdapter = require('../adapters/JsonStorageAdapter');
const AuthService = require('../services/AuthService');

async function bootstrap() {
    console.log('[Bootstrap] Starting initialization...');
    
    const storage = new JsonStorageAdapter();
    await storage.init();
    
    const authService = new AuthService(storage);
    
    // Check if admin user exists
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'; // Default password meets 8 char minimum
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@overmind.local';
    
    let adminUser = await storage.getUserByUsername(adminUsername);
    
    if (!adminUser) {
        console.log('[Bootstrap] Creating admin user...');
        
        // Create admin user
        const requirePasswordChange = process.env.NODE_ENV === 'production';
        
        adminUser = await authService.register(
            adminUsername,
            adminEmail,
            adminPassword,
            'Administrator',
            'admin'
        );
        
        // Update to require password change in production
        if (requirePasswordChange) {
            await storage.updateUser(adminUser.id, { requirePasswordChange: true });
            console.log('[Bootstrap] Admin user created. Password change required on first login.');
        } else {
            console.log('[Bootstrap] Admin user created with default credentials.');
            console.log(`[Bootstrap] Username: ${adminUsername}`);
            console.log(`[Bootstrap] Password: ${adminPassword}`);
            console.log('[Bootstrap] ⚠️  Change the default password in production!');
        }
    } else {
        console.log('[Bootstrap] Admin user already exists.');
    }
    
    // Initialize default personas
    const personas = await storage.getPersonas();
    
    if (personas.length === 0) {
        console.log('[Bootstrap] Creating default personas...');
        
        const defaultPersonas = [
            {
                name: 'Coder',
                systemPrompt: 'You are a senior software engineer. Provide concise, practical code solutions with clear explanations. Focus on best practices, clean code, and efficient implementations. Ask clarifying questions only when absolutely necessary.',
                temperature: 0.3,
                model: 'gpt-4',
                enabled: true,
                isDefault: true
            },
            {
                name: 'Friend',
                systemPrompt: 'You are a supportive, casual friend. Keep your messages warm, encouraging, and conversational. Use everyday language and show genuine interest. Keep responses relatively brief and friendly.',
                temperature: 0.8,
                model: 'gpt-4',
                enabled: true,
                isDefault: false
            },
            {
                name: 'Business',
                systemPrompt: 'You are a strategic business advisor. Frame responses in terms of KPIs, roadmaps, and pragmatic business outcomes. Focus on ROI, scalability, and competitive advantage. Be direct and results-oriented.',
                temperature: 0.5,
                model: 'gpt-4',
                enabled: true,
                isDefault: false
            },
            {
                name: 'Security Reviewer',
                systemPrompt: 'You are a security expert with a threat-model mindset. Analyze code and systems for vulnerabilities, suggest concrete mitigations, and point out security risks. Consider OWASP Top 10, common attack vectors, and defense in depth.',
                temperature: 0.2,
                model: 'gpt-4',
                enabled: true,
                isDefault: false
            }
        ];
        
        for (const persona of defaultPersonas) {
            await storage.createPersona(persona);
            console.log(`[Bootstrap] Created persona: ${persona.name}`);
        }
    } else {
        console.log('[Bootstrap] Personas already initialized.');
    }
    
    // Initialize default app config
    let appConfig = await storage.getAppConfig();
    
    if (!appConfig) {
        console.log('[Bootstrap] Creating default app configuration...');
        
        appConfig = await storage.updateAppConfig({
            logoUrl: 'images/overmind-logo-tp.png',
            backgroundUrl: 'images/bg.png',
            appName: 'Overmind',
            primaryColor: '#4a9eff'
        });
        
        console.log('[Bootstrap] App configuration initialized.');
    } else {
        console.log('[Bootstrap] App configuration already exists.');
    }
    
    console.log('[Bootstrap] Initialization complete!');
}

module.exports = { bootstrap };
