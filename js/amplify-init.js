// Initialize AWS Amplify v5 with proper imports
// This replaces amplify-loader.js with proper v5 initialization

(async function() {
    Logger.log('🚀 Initializing Amplify v5...');
    
    // For UMD builds, Amplify should be available as window.aws_amplify
    const checkAmplify = () => {
        const possibleNames = ['aws_amplify', 'awsAmplify', 'Amplify', 'AwsAmplify'];
        
        for (const name of possibleNames) {
            if (window[name]) {
                Logger.log(`✅ Found Amplify at window.${name}`);
                return window[name];
            }
        }
        return null;
    };
    
    // Wait for Amplify to load
    let amplifyLib = null;
    let attempts = 0;
    while (!amplifyLib && attempts < 50) {
        amplifyLib = checkAmplify();
        if (!amplifyLib) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
    }
    
    if (!amplifyLib) {
        Logger.error('❌ Amplify library not found after 5 seconds');
        Logger.log('Available globals:', Object.keys(window).filter(k => k.toLowerCase().includes('aws') || k.toLowerCase().includes('amplify')));
        
        // Continue without Amplify
        window.AmplifyConfigured = false;
        window.dispatchEvent(new CustomEvent('amplify-loaded', { detail: { success: false } }));
        return;
    }
    
    try {
        // Extract the Amplify configure function
        const { Amplify } = amplifyLib;
        
        if (!Amplify || !Amplify.configure) {
            Logger.error('❌ Amplify.configure not found');
            Logger.log('Amplify object:', Amplify);
            window.AmplifyConfigured = false;
            window.dispatchEvent(new CustomEvent('amplify-loaded', { detail: { success: false } }));
            return;
        }
        
        // Configure Amplify
        Amplify.configure({
            Auth: {
                Cognito: {
                    userPoolId: 'us-east-1_cLPH2acQd',
                    userPoolClientId: '2pp1r86dvfqbbu5fe0b1od3m07',
                    identityPoolId: 'us-east-1:c740f334-5bd2-43c6-85b9-48bfebf27268',
                    allowGuestAccess: true
                }
            }
        });
        
        // Make Amplify available globally
        window.Amplify = Amplify;
        window.AmplifyConfigured = true;
        
        Logger.log('✅ Amplify configured successfully');
        window.dispatchEvent(new CustomEvent('amplify-loaded', { detail: { success: true, amplify: Amplify } }));
        
    } catch (error) {
        Logger.error('❌ Error configuring Amplify:', error);
        window.AmplifyConfigured = false;
        window.dispatchEvent(new CustomEvent('amplify-loaded', { detail: { success: false, error } }));
    }
})();