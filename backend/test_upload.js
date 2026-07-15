const fs = require('fs');

async function testUpload() {
    try {
        // 1. Register a test user
        console.log('Registering user...');
        let res = await fetch('https://social-media-pro-zbbe.onrender.com/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test User',
                username: 'testuser' + Date.now(),
                email: 'test' + Date.now() + '@test.com',
                password: 'password'
            })
        });

        // Cookie parsing to simulate browser
        const cookies = res.headers.get('set-cookie');
        console.log('Registered. Cookies:', cookies);

        // 2. Create a dummy test file
        fs.writeFileSync('test.txt', 'This is a test image content');

        // 3. Post to /api/posts with dummy file using web FormData (Node 18+)
        console.log('\nPosting file...');
        const formData = new FormData();
        formData.append('content', 'Testing upload from script!');

        // Polyfill File or use Blob since we are in Node
        const blob = new Blob([fs.readFileSync('test.txt')], { type: 'image/jpeg' });
        formData.append('image', blob, 'test.jpg');

        res = await fetch('https://social-media-pro-zbbe.onrender.com/api/posts', {
            method: 'POST',
            headers: { 'Cookie': cookies || '' },
            body: formData
        });

        const status = res.status;
        const bodyText = await res.text();
        console.log('\n--- UPLOAD RESPONSE ---');
        console.log('STATUS:', status);
        console.log('BODY:', bodyText);

        fs.unlinkSync('test.txt');
    } catch (err) {
        console.error('Error:', err);
    }
}

testUpload();
