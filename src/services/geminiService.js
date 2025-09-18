const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  async generateResponse(query, retrievedDocuments) {
    try {
      // Create context from retrieved documents
      const context = retrievedDocuments.map((doc, index) => 
        `Source ${index + 1} (${doc.metadata.source}): ${doc.document}`
      ).join('\n\n');

      // Create the prompt
      const prompt = `
You are a helpful and friendly news assistant.  
Your main job is to answer user questions using the provided news articles.  
At the same time, be conversational and interactive:  
- If the user greets you (e.g., "hello", "hi"), greet them back warmly.  
- If the user says "thanks" or similar, respond politely.  
- If the user asks casual small talk (like "how are you?"), give a short friendly reply.  
- For news-related questions, answer using only the provided articles.  
- But Dont say if now news is there its not in articles Handle it diplomatically

Context from news articles:
${context}

User Question: ${query}

Instructions:
- Use only information from the provided news articles for answering news-related questions.  
- If the information isn't in the articles, say so clearly.  
- Be concise but informative.  
- Mention relevant sources when appropriate.  
- If multiple perspectives exist, present them fairly.  
- Always keep a friendly and professional tone.  

Answer:

`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      return {
        text: response.text(),
        sources: retrievedDocuments.map(doc => ({
          title: doc.metadata.title,
          source: doc.metadata.source,
          link: doc.metadata.link
        }))
      };

    } catch (error) {
      console.error('Error generating response with Gemini:', error);
      
      // Fallback response
      return {
        text: "I apologize, but I'm having trouble generating a response right now. Please try again later.",
        sources: []
      };
    }
  }

  async generateStreamingResponse(query, retrievedDocuments) {
    try {
      const context = retrievedDocuments.map((doc, index) => 
        `Source ${index + 1}: ${doc.document}`
      ).join('\n\n');

      const prompt = `Based on these news articles: ${context}\n\nAnswer this question: ${query}`;

      const result = await this.model.generateContentStream(prompt);
      
      return result.stream;
    } catch (error) {
      console.error('Error with streaming response:', error);
      throw error;
    }
  }
}

module.exports = GeminiService;
