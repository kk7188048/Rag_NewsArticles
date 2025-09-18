const axios = require('axios');

class EmbeddingService {
  constructor() {
    this.apiUrl = 'https://api.jina.ai/v1/embeddings';
    this.model = 'jina-embeddings-v3'; 
    this.task = 'text-matching';       
  }

  async generateEmbeddings(texts) {
    try {
      const inputTexts = Array.isArray(texts) ? texts : [texts];

      if (!inputTexts.length) {
        throw new Error("No input texts provided for embedding.");
      }

      console.log("Sending texts to Jina:", inputTexts);

      const response = await axios.post(this.apiUrl, {
        model: this.model,
        task: this.task,               
        input: inputTexts
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.JINA_API_KEY}`
        }
      });

      return response.data.data.map(item => item.embedding);
    } catch (error) {
      console.error('Error generating embeddings:', error.message);
      if (error.response) {
        console.error('API response:', error.response.data);
      }
      
      return this.generateSimpleEmbeddings(texts);
    }
  }

  generateSimpleEmbeddings(texts) {
    return texts.map(text => {
      const vector = new Array(384).fill(0);
      for (let i = 0; i < text.length; i++) {
        vector[i % 384] += text.charCodeAt(i);
      }
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      return vector.map(val => val / magnitude);
    });
  }

  async embedArticles(articles) {
    console.log(`${articles.length} articles...`);
    const texts = articles.map(article => 
      `${article.title}\n${article.content || article.description}`
    );

    const embeddings = await this.generateEmbeddings(texts);

    return articles.map((article, index) => ({
      ...article,
      embedding: embeddings[index]
    }));
  }

  async embedQuery(query) {
    const embeddings = await this.generateEmbeddings([query]);
    return embeddings[0];
  }
}

module.exports = EmbeddingService;
