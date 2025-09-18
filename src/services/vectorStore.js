const { CloudClient } = require('chromadb');
const dotenv = require('dotenv');

class VectorStoreService {
  constructor() {
    // Initialize Chroma Cloud client
    this.client = new CloudClient({
            apiKey: process.env.CHROMA_API_KEY,
            tenant: process.env.CHROMA_TENANT,
            database: process.env.CHROMA_DATABASE
        });
    
    this.collectionName = 'news_articles';
    this.collection = null;
  }

  async initialize() {
    try {
      console.log('Connecting to Chroma Cloud');
      await this.testConnection();
      
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: { 
          "hnsw:space": "cosine",
          "description": "News articles for RAG chatbot"
        }
      });
      
      console.log('Connected to Chroma Cloud successfully');
      console.log(`Collection: ${this.collectionName}`);
      
    } catch (error) {
      console.error('Error connecting to Chroma Cloud:', error.message);
      
      // Provide helpful error messages
      if (error.message.includes('authentication')) {
        console.error('Check your CHROMA_API_KEY in .env file');
      } else if (error.message.includes('tenant')) {
        console.error('Check your CHROMA_TENANT in .env file');
      } else if (error.message.includes('database')) {
        console.error('heck your CHROMA_DATABASE in .env file');
      }
      
      throw error;
    }
  }

  async testConnection() {
    try {
      // Simple test to verify connection
      await this.client.listCollections();
      console.log('Chroma Cloud connection test passed');
    } catch (error) {
      console.error('Chroma Cloud connection test failed:', error.message);
      throw new Error(`Chroma Cloud connection failed: ${error.message}`);
    }
  }

  async addArticles(articlesWithEmbeddings) {
    if (!this.collection) {
      throw new Error('Vector store not initialized');
    }

    try {
      console.log(`Adding ${articlesWithEmbeddings.length} articles to Chroma Cloud...`);
      
      const ids = articlesWithEmbeddings.map(article => article.id.toString());
      const embeddings = articlesWithEmbeddings.map(article => article.embedding);
      const documents = articlesWithEmbeddings.map(article => 
        `${article.title}\n${article.content || article.description}`
      );
      const metadatas = articlesWithEmbeddings.map(article => ({
        title: article.title || 'Untitled',
        source: article.source || 'unknown',
        pubDate: article.pubDate || new Date().toISOString(),
        link: article.link || '',
        content_length: (article.content || article.description || '').length
      }));

      // Add in batches to handle large datasets
      const batchSize = 100;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batchIds = ids.slice(i, i + batchSize);
        const batchEmbeddings = embeddings.slice(i, i + batchSize);
        const batchDocuments = documents.slice(i, i + batchSize);
        const batchMetadatas = metadatas.slice(i, i + batchSize);

        await this.collection.add({
          ids: batchIds,
          embeddings: batchEmbeddings,
          documents: batchDocuments,
          metadatas: batchMetadatas
        });

        console.log(`Added batch`);
      }

      console.log(`Successfully added articles to Chroma Cloud`);
      
    } catch (error) {
      console.error('Error adding articles to Chroma Cloud:', error.message);
      
      if (error.message.includes('quota') || error.message.includes('limit')) {
        console.error('You may have reached your Chroma Cloud usage limit. Check your dashboard.');
      }
      
      throw error;
    }
  }

  async searchSimilar(queryEmbedding, topK = 5) {
    if (!this.collection) {
      throw new Error('Vector store not initialized');
    }

    try {
      console.log(`Searching for ${topK} similar documents in Chroma Cloud`);
      
      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
        include: ["documents", "metadatas", "distances"]
      });

      const searchResults = results.documents[0].map((doc, index) => ({
        document: doc,
        metadata: results.metadatas[0][index],
        distance: results.distances[0][index],
        similarity: 1 - results.distances[0][index] 
      }));

      console.log(`Found ${searchResults.length} similar documents`);
      
      return searchResults;
      
    } catch (error) {
      console.error('Error searching Chroma Cloud:', error.message);
      throw error;
    }
  }

  async getCollectionInfo() {
    if (!this.collection) {
      return { count: 0, status: 'not_initialized' };
    }

    try {
      const count = await this.collection.count();
      console.log(`Collection info: ${count} documents in Chroma Cloud`);
      
      return { 
        count,
        status: 'connected',
        collectionName: this.collectionName,
        tenant: process.env.CHROMA_TENANT,
        database: process.env.CHROMA_DATABASE
      };
      
    } catch (error) {
      console.error('Error getting collection info from Chroma Cloud:', error.message);
      return { 
        count: 0, 
        status: 'error',
        error: error.message 
      };
    }
  }

  async deleteCollection() {
    try {
      await this.client.deleteCollection({ name: this.collectionName });
      console.log(`Deleted collection: ${this.collectionName}`);
      this.collection = null;
    } catch (error) {
      console.error('Error deleting collection:', error.message);
      throw error;
    }
  }

  async listCollections() {
    try {
      const collections = await this.client.listCollections();
      console.log(`Available collections:`, collections.map(c => c.name));
      return collections;
    } catch (error) {
      console.error('Error listing collections:', error.message);
      throw error;
    }
  }
}

module.exports = VectorStoreService;
