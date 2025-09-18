require('dotenv').config();
const { CloudClient } = require('chromadb');

async function testChromaCloud() {
    try {
        console.log('🧪 Testing Chroma Cloud connection...');


        const client = new CloudClient({
            apiKey: 'ck-35qkrD9gojPZTorRE6QTQKg74HkxWRR81T9KKqyNB3u4',
            tenant: '0301518c-e7db-41cb-90cf-e46f2ac30b1a',
            database: 'gemini'
        });

        // Test basic connection
        const collections = await client.listCollections();
        console.log('✅ Connected successfully!');
        console.log(`📋 Found ${collections.length} collections`);

        // Test creating a collection
        const testCollection = await client.getOrCreateCollection({
            name: 'test_connection',
            metadata: { "hnsw:space": "cosine" }
        });

        console.log('✅ Test collection created/retrieved');

        // Test adding a document
        await testCollection.add({
            ids: ['test1'],
            documents: ['This is a test document'],
            metadatas: [{ source: 'test' }]
        });

        console.log('✅ Test document added');

        // Test querying
        const results = await testCollection.query({
            queryTexts: ['test query'],
            nResults: 1
        });

        console.log('✅ Test query successful');
        console.log('🎉 Chroma Cloud is working perfectly!');

        // Clean up
        await client.deleteCollection({ name: 'test_connection' });
        console.log('🧹 Test collection cleaned up');

    } catch (error) {
        console.error('❌ Chroma Cloud test failed:', error.message);
        console.error('💡 Please check your environment variables:');
        console.error('   - CHROMA_API_KEY');
        console.error('   - CHROMA_TENANT');
        console.error('   - CHROMA_DATABASE');
    }
}

testChromaCloud();
