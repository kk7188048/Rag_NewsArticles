const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

class NewsIngestionService {
  constructor() {
    this.articles = [];
    this.dataDir = path.join(__dirname, '../../data/news_articles');
    this.maxArticles = 100; // Increased for better coverage
    this.categories = this.getRSSFeeds();
  }

  // Comprehensive RSS feed sources categorized
  getRSSFeeds() {
    return {
      // World News & Current Affairs
      world: [
        { url: 'https://feeds.bbci.co.uk/news/rss.xml', name: 'BBC News' },
        { url: 'http://rss.cnn.com/rss/edition.rss', name: 'CNN' },
        { url: 'http://feeds.reuters.com/Reuters/worldNews', name: 'Reuters World' },
        { url: 'https://www.theguardian.com/world/rss', name: 'The Guardian World' },
        { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera' },
        { url: 'https://feeds.npr.org/1001/rss.xml', name: 'NPR News' },
        { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', name: 'NY Times' },
        { url: 'https://feeds.washingtonpost.com/rss/world', name: 'Washington Post' }
      ],

      // Technology & Startups
      technology: [
        { url: 'http://feeds.feedburner.com/TechCrunch/', name: 'TechCrunch' },
        { url: 'https://www.wired.com/feed/rss', name: 'Wired' },
        { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge' },
        { url: 'http://feeds.arstechnica.com/arstechnica/index/', name: 'Ars Technica' },
        { url: 'http://feeds.mashable.com/Mashable', name: 'Mashable' },
        { url: 'https://www.engadget.com/rss.xml', name: 'Engadget' },
        { url: 'https://venturebeat.com/feed/', name: 'VentureBeat' },
        { url: 'https://gizmodo.com/rss', name: 'Gizmodo' },
        { url: 'https://news.ycombinator.com/rss', name: 'Hacker News' }
      ],

      // Business & Finance
      business: [
        { url: 'https://www.forbes.com/business/feed/', name: 'Forbes Business' },
        { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', name: 'CNBC' },
        { url: 'https://www.ft.com/?format=rss', name: 'Financial Times' },
        { url: 'https://hbr.org/feed', name: 'Harvard Business Review' },
        { url: 'https://www.marketwatch.com/rss/topstories', name: 'MarketWatch' },
        { url: 'https://www.businessinsider.com/rss', name: 'Business Insider' },
        { url: 'https://www.economist.com/latest/rss.xml', name: 'The Economist' }
      ],

      // Sports
      sports: [
        { url: 'https://www.espn.com/espn/rss/news', name: 'ESPN' },
        { url: 'https://feeds.bbci.co.uk/sport/rss.xml', name: 'BBC Sport' },
        { url: 'https://www.skysports.com/rss/12040', name: 'Sky Sports' },
        { url: 'https://www.si.com/rss/si_topstories.rss', name: 'Sports Illustrated' },
        { url: 'https://www.nba.com/rss/nba_rss.xml', name: 'NBA' },
        { url: 'https://theathletic.com/feed/', name: 'The Athletic' }
      ],

      // Entertainment & Pop Culture
      entertainment: [
        { url: 'https://variety.com/feed/', name: 'Variety' },
        { url: 'https://www.rollingstone.com/music/music-news/feed/', name: 'Rolling Stone' },
        { url: 'https://www.billboard.com/feed/', name: 'Billboard' },
        { url: 'https://deadline.com/feed/', name: 'Deadline' },
        { url: 'https://ew.com/feed/', name: 'Entertainment Weekly' }
      ],

      // Health & Science
      health: [
        { url: 'https://www.medicalnewstoday.com/rss', name: 'Medical News Today' },
        { url: 'https://www.healthline.com/rss', name: 'Healthline' },
        { url: 'https://www.sciencedaily.com/rss/all.xml', name: 'Science Daily' },
        { url: 'https://feeds.feedburner.com/NewScientistOnline', name: 'New Scientist' }
      ]
    };
  }

  async ensureDataDirectory() {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
    }
  }

  // Enhanced RSS scraping with category support
  async scrapeFromRSS(selectedCategories = ['world', 'technology', 'business']) {
    console.log(`🗞️ Starting RSS feed scraping for categories: ${selectedCategories.join(', ')}`);
    
    const articlesPerCategory = Math.ceil(this.maxArticles / selectedCategories.length);
    
    for (const category of selectedCategories) {
      if (!this.categories[category]) {
        console.warn(`⚠️ Category '${category}' not found, skipping...`);
        continue;
      }

      console.log(`📰 Scraping ${category.toUpperCase()} news...`);
      await this.scrapeCategory(category, articlesPerCategory);
    }

    console.log(`✅ Total articles scraped: ${this.articles.length}`);
    return this.articles;
  }

  async scrapeCategory(category, maxArticles) {
    const feeds = this.categories[category];
    const articlesPerFeed = Math.ceil(maxArticles / feeds.length);

    for (const feed of feeds) {
      if (this.articles.length >= this.maxArticles) break;

      try {
        console.log(`  📡 Fetching from ${feed.name}...`);
        
        const response = await axios.get(feed.url, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
            'Accept': 'application/rss+xml, application/xml, text/xml'
          }
        });

        const $ = cheerio.load(response.data, { xmlMode: true });
        let articleCount = 0;
        
        $('item').each((index, item) => {
          if (articleCount >= articlesPerFeed || this.articles.length >= this.maxArticles) {
            return false;
          }
          
          const $item = $(item);
          const article = this.parseArticleFromRSS($item, feed.name, category);
          
          if (this.isValidArticle(article)) {
            this.articles.push(article);
            articleCount++;
          }
        });

        console.log(`    ✅ Got ${articleCount} articles from ${feed.name}`);
        
        // Small delay to be respectful to servers
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`    ❌ Error scraping ${feed.name}:`, error.message);
      }
    }
  }

  parseArticleFromRSS($item, sourceName, category) {
    // Extract content with multiple fallbacks
    const title = $item.find('title').text().trim();
    const description = $item.find('description').text().trim();
    const content = $item.find('content\\:encoded').text().trim() || 
                   $item.find('content').text().trim() || 
                   description;
    
    // Clean HTML tags from content
    const cleanContent = this.cleanHtmlContent(content);
    const cleanDescription = this.cleanHtmlContent(description);

    return {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: this.cleanText(title),
      description: this.cleanText(cleanDescription),
      content: this.cleanText(cleanContent),
      link: $item.find('link').text().trim(),
      pubDate: $item.find('pubDate').text().trim() || new Date().toISOString(),
      source: sourceName,
      category: category,
      author: $item.find('author').text().trim() || $item.find('dc\\:creator').text().trim(),
      guid: $item.find('guid').text().trim(),
      contentLength: cleanContent.length,
      timestamp: Date.now()
    };
  }

  cleanHtmlContent(html) {
    if (!html) return '';
    
    // Remove HTML tags but preserve text content
    const $ = cheerio.load(html);
    return $.text().trim();
  }

  cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/[^\x20-\x7E]/g, '') // Remove non-ASCII characters
      .trim();
  }

  isValidArticle(article) {
    return article.title && 
           article.title.length > 10 && 
           (article.content || article.description) &&
           (article.content?.length > 50 || article.description?.length > 50);
  }

  // Enhanced sample data with categories
  async loadSampleData() {
    const sampleArticles = [
      // Technology
      {
        id: "tech_1",
        title: "Revolutionary AI Breakthrough: New Language Model Achieves Human-Level Understanding",
        content: "Researchers at leading tech companies have announced a groundbreaking advancement in artificial intelligence. The new language model demonstrates unprecedented understanding of context, nuance, and complex reasoning tasks. This breakthrough could transform industries from healthcare to education, marking a significant milestone in AI development.",
        description: "Major AI breakthrough achieves human-level language understanding",
        source: "TechNews",
        category: "technology",
        pubDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        link: "https://example.com/ai-breakthrough",
        contentLength: 400
      },
      
      // Business
      {
        id: "business_1", 
        title: "Global Markets Rally as Economic Indicators Show Strong Growth",
        content: "Stock markets worldwide experienced significant gains following the release of positive economic data. Key indicators suggest robust consumer spending, low unemployment rates, and healthy corporate earnings. Analysts predict continued growth in the coming quarters, though some caution about potential headwinds from geopolitical tensions.",
        description: "Markets surge on positive economic data and growth forecasts",
        source: "Financial Times",
        category: "business", 
        pubDate: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
        link: "https://example.com/market-rally",
        contentLength: 380
      },

      // World News
      {
        id: "world_1",
        title: "International Climate Summit Reaches Historic Agreement on Carbon Reduction",
        content: "World leaders have reached a landmark agreement at the International Climate Summit, committing to ambitious carbon reduction targets. The accord includes binding commitments from major economies and substantial funding for developing nations to transition to clean energy. Environmental groups hail it as a crucial step in addressing climate change.",
        description: "Historic climate agreement reached with binding carbon reduction targets",
        source: "Global News",
        category: "world",
        pubDate: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        link: "https://example.com/climate-summit",
        contentLength: 420
      },

      // Sports
      {
        id: "sports_1",
        title: "Championship Finals Set as Underdog Team Defeats Defending Champions",
        content: "In a stunning upset, the underdog team defeated the defending champions in a thrilling semifinal match. The victory came after a dramatic overtime period that saw spectacular plays from both sides. The team will now face another strong contender in the championship finals next week, setting up what promises to be an epic showdown.",
        description: "Underdog team reaches championship finals after stunning upset victory",
        source: "Sports Central",
        category: "sports",
        pubDate: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
        link: "https://example.com/championship-upset",
        contentLength: 350
      },

      // Entertainment
      {
        id: "entertainment_1",
        title: "Streaming Wars Heat Up as New Platform Announces Star-Studded Original Series",
        content: "The competition in the streaming industry intensified today with the announcement of a new original series featuring A-list actors and acclaimed directors. The production, with a reported budget exceeding $200 million, represents the platform's biggest investment in original content. Industry analysts see this as a direct challenge to established streaming giants.",
        description: "New streaming platform announces massive investment in original content",
        source: "Entertainment Weekly",
        category: "entertainment",
        pubDate: new Date(Date.now() - 64800000).toISOString(), // 18 hours ago  
        link: "https://example.com/streaming-wars",
        contentLength: 390
      },

      // Health
      {
        id: "health_1",
        title: "Medical Breakthrough: New Treatment Shows Promise for Rare Disease",
        content: "Scientists have developed a promising new treatment for a rare genetic disease that affects thousands worldwide. Clinical trials show significant improvement in patient outcomes with minimal side effects. The treatment uses innovative gene therapy techniques and could be available to patients within the next two years, pending regulatory approval.",
        description: "Gene therapy breakthrough offers hope for rare disease patients",
        source: "Medical Journal",
        category: "health",
        pubDate: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
        link: "https://example.com/medical-breakthrough", 
        contentLength: 360
      }
    ];

    this.articles = sampleArticles;
    console.log(`📋 Loaded ${this.articles.length} sample articles across ${new Set(sampleArticles.map(a => a.category)).size} categories`);
  }

  // Save articles with metadata
  async saveArticles() {
    await this.ensureDataDirectory();
    const filePath = path.join(this.dataDir, 'articles.json');
    
    const metadata = {
      totalArticles: this.articles.length,
      categories: this.getArticleStats(),
      lastUpdated: new Date().toISOString(),
      sources: [...new Set(this.articles.map(a => a.source))]
    };

    const data = {
      metadata,
      articles: this.articles
    };

    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`💾 Saved ${this.articles.length} articles to ${filePath}`);
    console.log(`📊 Categories: ${Object.keys(metadata.categories).join(', ')}`);
  }

  // Load articles with backward compatibility
  async loadArticles() {
    await this.ensureDataDirectory();
    const filePath = path.join(this.dataDir, 'articles.json');
    
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(data);
      
      // Handle both old and new format
      if (parsed.articles) {
        this.articles = parsed.articles;
        console.log(`📂 Loaded ${this.articles.length} articles from file`);
        if (parsed.metadata) {
          console.log(`📊 Categories: ${Object.keys(parsed.metadata.categories).join(', ')}`);
        }
      } else {
        // Old format compatibility
        this.articles = parsed;
        console.log(`📂 Loaded ${this.articles.length} articles (legacy format)`);
      }
      
      return this.articles;
    } catch (error) {
      console.log('📁 No existing articles file found, will create new one');
      return [];
    }
  }

  getArticleStats() {
    const stats = {};
    this.articles.forEach(article => {
      const category = article.category || 'uncategorized';
      stats[category] = (stats[category] || 0) + 1;
    });
    return stats;
  }

  // Get articles by category
  getArticlesByCategory(category) {
    return this.articles.filter(article => article.category === category);
  }

  // Get recent articles (last N days)
  getRecentArticles(days = 7) {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    return this.articles.filter(article => {
      const articleTime = new Date(article.pubDate).getTime() || article.timestamp || 0;
      return articleTime > cutoff;
    });
  }

  getArticles() {
    return this.articles;
  }

  // Get available categories
  getAvailableCategories() {
    return Object.keys(this.categories);
  }

  // Search articles by keyword
  searchArticles(keyword) {
    const searchTerm = keyword.toLowerCase();
    return this.articles.filter(article => 
      article.title?.toLowerCase().includes(searchTerm) ||
      article.content?.toLowerCase().includes(searchTerm) ||
      article.description?.toLowerCase().includes(searchTerm)
    );
  }
}

module.exports = NewsIngestionService;
