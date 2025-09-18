const NewsIngestionService = require('./newsIngestion');
const EmbeddingService = require('./embeddingService');
const VectorStoreService = require('./vectorStore');
const GeminiService = require('./geminiService');

class RAGService {
  constructor() {
    this.newsService = new NewsIngestionService();
    this.embeddingService = new EmbeddingService();
    this.vectorStore = new VectorStoreService();
    this.geminiService = new GeminiService();
    this.isInitialized = false;
  }

  async initialize() {
    console.log('Initializing RAG pipeline...');
    
    try {
      await this.vectorStore.initialize();

      const info = await this.vectorStore.getCollectionInfo();
      
      if (info.count === 0) {
        console.log('No articles found');
        await this.ingestAndIndexArticles();
      } else {
        console.log(`Found ${info.count} articles`);
      }

      this.isInitialized = true;
      console.log('RAG initialized successfully');
      
    } catch (error) {
      console.error('Error initializing RAG :', error);
      throw error;
    }
  }

async ingestAndIndexArticles() {
  try {
    let articles = await this.newsService.loadArticles();
    
    if (articles.length === 0) {
      console.log('Scraping articles...');
      
      // Choose categories for scraping
      const categories = ['world', 'technology', 'business', 'sports'];
      await this.newsService.scrapeFromRSS(categories);
      articles = this.newsService.getArticles();
      
      if (articles.length === 0) {
        await this.newsService.loadSampleData();
        articles = this.newsService.getArticles();
      }
      
      await this.newsService.saveArticles();
    }

    const stats = this.newsService.getArticleStats();

    // Generate embeddings and store
    const articlesWithEmbeddings = await this.embeddingService.embedArticles(articles);
    await this.vectorStore.addArticles(articlesWithEmbeddings);

    console.log(`Successfully indexed ${articles.length} articles across ${Object.keys(stats).length} categories`);
    return articles.length;
    
  } catch (error) {
    console.error('Error ingesting articles:', error);
    throw error;
  }
}


  async processQuery(query) {
    if (!this.isInitialized) {
      throw new Error('RAG service not initialized');
    }

    try {
      console.log(`Processing query: ${query}`);
      const queryEmbedding = await this.embeddingService.embedQuery(query);

      const retrievedDocs = await this.vectorStore.searchSimilar(queryEmbedding, 5);
      console.log(`Retrieved ${retrievedDocs.length} relevant documents`);

      const response = await this.geminiService.generateResponse(query, retrievedDocs);

      return {
        query,
        response: response.text,
        sources: response.sources,
        retrievedCount: retrievedDocs.length
      };

    } catch (error) {
      console.error('Error processing query:', error);
      throw error;
    }
  }

  async processStreamingQuery(query) {
    if (!this.isInitialized) {
      throw new Error('RAG service not initialized');
    }

    try {
      const queryEmbedding = await this.embeddingService.embedQuery(query);
      const retrievedDocs = await this.vectorStore.searchSimilar(queryEmbedding, 5);
      
      const stream = await this.geminiService.generateStreamingResponse(query, retrievedDocs);
      
      return {
        stream,
        sources: retrievedDocs.map(doc => ({
          title: doc.metadata.title,
          source: doc.metadata.source,
          link: doc.metadata.link
        }))
      };

    } catch (error) {
      console.error('Error processing streaming query:', error);
      throw error;
    }
  }

  async getStats() {
    const info = await this.vectorStore.getCollectionInfo();
    return {
      articleCount: info.count,
      isInitialized: this.isInitialized
    };
  }
}

module.exports = RAGService;
