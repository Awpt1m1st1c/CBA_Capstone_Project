// import { config } from "../config/config.js";
// import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
// import { AzureKeyCredential } from "@azure/core-auth";

// class AIService {
//   constructor() {
//     this.azureApiKey = config.azureApiKey;
//   }

//   async generateText(prompt) {
//     return this.generateTextWithAzure(prompt);
//   }

//   async generateTextWithAzure(prompt) {
//     try {
//       console.log(`Starting Azure AI generation at ${new Date().toISOString()}`);
//       const startTime = Date.now();
      
//       const client = ModelClient(
//         "https://models.inference.ai.azure.com",
//         new AzureKeyCredential(this.azureApiKey)
//       );

//       const response = await client.path("/chat/completions").post({
//         body: {
//           messages: [
//             { 
//               role: "system", 
//               content: "You are an AI real estate expert assistant that provides concise, accurate analysis of property data."
//             },
//             { 
//               role: "user", 
//               content: prompt 
//             }
//           ],
//           model: "gpt-4o",
//           temperature: 0.7,
//           max_tokens: 800,
//           top_p: 1
//         }
//       });

//       const endTime = Date.now();
//       console.log(`Azure AI generation completed in ${(endTime - startTime) / 1000} seconds`);

//       if (isUnexpected(response)) {
//         throw new Error(response.body.error.message || "Azure API error");
//       }
      
//       return response.body.choices[0].message.content;
//     } catch (error) {
//       console.error("Error generating text with Azure:", error);
//       return `Error: ${error.message}`;
//     }
//   }

//   // Helper method to filter and clean property data before analysis
//   _preparePropertyData(properties, maxProperties = 3) {
//     // Limit the number of properties
//     const limitedProperties = properties.slice(0, maxProperties);
    
//     // Clean and simplify each property
//     return limitedProperties.map(property => ({
//       building_name: property.building_name,
//       property_type: property.property_type,
//       location_address: property.location_address,
//       price: property.price,
//       area_sqft: property.area_sqft,
//       // Extract just a few key amenities
//       amenities: Array.isArray(property.amenities) 
//         ? property.amenities.slice(0, 5) 
//         : [],
//       // Truncate description to save tokens
//       description: property.description 
//         ? property.description.substring(0, 150) + (property.description.length > 150 ? '...' : '')
//         : ''
//     }));
//   }

//   // Helper method to filter and clean location data
//   _prepareLocationData(locations, maxLocations = 5) {
//     // Limit the number of locations
//     return locations.slice(0, maxLocations);
//   }

//   async analyzeProperties(
//     properties,
//     city,
//     maxPrice,
//     propertyCategory,
//     propertyType
//   ) {
//     // Prepare limited and cleaned property data
//     const preparedProperties = this._preparePropertyData(properties);

//     const prompt = `As a real estate expert, analyze these properties:

//         Properties Found in ${city}:
//         ${JSON.stringify(preparedProperties, null, 2)}

//         INSTRUCTIONS:
//         1. Focus ONLY on these properties that match:
//            - Property Category: ${propertyCategory}
//            - Property Type: ${propertyType}
//            - Maximum Price: ${maxPrice} crores
//         2. Provide a brief analysis with these sections:
//            - Property Overview (basic facts about each)
//            - Best Value Analysis (which offers the best value)
//            - Quick Recommendations

//         Keep your response concise and focused on these properties only.
//         `;

//     return this.generateText(prompt);
//   }

//   async analyzeLocationTrends(locations, city) {
//     // Prepare limited location data
//     const preparedLocations = this._prepareLocationData(locations);

//     const prompt = `As a real estate expert, analyze these location price trends for ${city}:

//         ${JSON.stringify(preparedLocations, null, 2)}

//         Please provide:
//         1. A brief summary of price trends for each location
//         2. Which areas are showing the highest appreciation
//         3. Which areas offer the best rental yield
//         4. Quick investment recommendations based on this data

//         Keep your response concise (maximum 300 words).
//         `;

//     return this.generateText(prompt);
//   }
// }

// export default new AIService();

import { config } from "../config/config.js";
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

class AIService {
  constructor() {
    this.azureApiKey = config.azureApiKey;
    this.openAIApiKey = config.openAIApiKey;
    this.openRouterApiKey = config.openRouterApiKey;
    this.huggingfaceApiKey = config.huggingfaceApiKey;
    
    // Determine which provider to use (priority order)
    this.provider = this._determineProvider();
    
    // Initialize Google Gemini if API key is available
    if (config.googleApiKey) {
      this.geminiClient = new GoogleGenerativeAI(config.googleApiKey);
    }
  }

  _determineProvider() {
    // If explicitly set, use that provider
    if (config.aiProvider && config.aiProvider !== 'auto') {
      return config.aiProvider;
    }
    
    // Auto-detect based on available API keys
    // Priority: OpenAI > OpenRouter > Google Gemini > Azure > HuggingFace
    if (this.openAIApiKey) return 'openai';
    if (this.openRouterApiKey) return 'openrouter';
    if (config.googleApiKey) return 'gemini';
    if (this.azureApiKey) return 'azure';
    if (this.huggingfaceApiKey) return 'huggingface';
    return 'openai'; // default fallback
  }

  async generateText(prompt) {
    switch (this.provider) {
      case 'openai':
        return this.generateTextWithOpenAI(prompt);
      case 'openrouter':
        return this.generateTextWithOpenRouter(prompt);
      case 'gemini':
        return this.generateTextWithGemini(prompt);
      case 'azure':
        return this.generateTextWithAzure(prompt);
      case 'huggingface':
        return this.generateTextWithHuggingFace(prompt);
      default:
        return this.generateTextWithOpenAI(prompt);
    }
  }

  // OpenAI API (Recommended - Direct replacement)
  async generateTextWithOpenAI(prompt) {
    try {
      if (!this.openAIApiKey) {
        throw new Error("OpenAI API key not configured");
      }

      console.log(`Starting OpenAI generation at ${new Date().toISOString()}`);
      const startTime = Date.now();

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.openAIApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini", // or "gpt-4o" for better quality
          messages: [
            { 
              role: "system", 
              content: "You are an AI real estate expert assistant that provides concise, accurate analysis of property data."
            },
            { 
              role: "user", 
              content: prompt 
            }
          ],
          temperature: 0.7,
          max_tokens: 800
        })
      });

      const data = await response.json();
      const endTime = Date.now();
      console.log(`OpenAI generation completed in ${(endTime - startTime) / 1000} seconds`);

      if (!response.ok) {
        throw new Error(data.error?.message || "OpenAI API error");
      }
      
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Error generating text with OpenAI:", error);
      return `Error: ${error.message}`;
    }
  }

  // OpenRouter API (Access to multiple models)
  async generateTextWithOpenRouter(prompt) {
    try {
      if (!this.openRouterApiKey) {
        throw new Error("OpenRouter API key not configured");
      }

      console.log(`Starting OpenRouter generation at ${new Date().toISOString()}`);
      const startTime = Date.now();

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.openRouterApiKey}`,
          "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:5173",
          "X-Title": "BuildEstate"
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini", // or "anthropic/claude-3-haiku" for cheaper option
          messages: [
            { 
              role: "system", 
              content: "You are an AI real estate expert assistant that provides concise, accurate analysis of property data."
            },
            { 
              role: "user", 
              content: prompt 
            }
          ],
          temperature: 0.7,
          max_tokens: 800
        })
      });

      const data = await response.json();
      const endTime = Date.now();
      console.log(`OpenRouter generation completed in ${(endTime - startTime) / 1000} seconds`);

      if (!response.ok) {
        throw new Error(data.error?.message || "OpenRouter API error");
      }
      
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Error generating text with OpenRouter:", error);
      return `Error: ${error.message}`;
    }
  }

  // Google Gemini API (Free tier available)
  async generateTextWithGemini(prompt) {
    try {
      if (!this.geminiClient) {
        throw new Error("Google Gemini API key not configured");
      }

      console.log(`Starting Gemini generation at ${new Date().toISOString()}`);
      const startTime = Date.now();

      const model = this.geminiClient.getGenerativeModel({ 
        model: "gemini-1.5-flash" // or "gemini-1.5-pro" for better quality
      });

      const result = await model.generateContent(
        `You are an AI real estate expert assistant that provides concise, accurate analysis of property data.\n\n${prompt}`
      );

      const response = await result.response;
      const endTime = Date.now();
      console.log(`Gemini generation completed in ${(endTime - startTime) / 1000} seconds`);

      return response.text();
    } catch (error) {
      console.error("Error generating text with Gemini:", error);
      return `Error: ${error.message}`;
    }
  }

  // Azure AI (Original implementation)
  async generateTextWithAzure(prompt) {
    try {
      if (!this.azureApiKey) {
        throw new Error("Azure API key not configured");
      }

      console.log(`Starting Azure AI generation at ${new Date().toISOString()}`);
      const startTime = Date.now();
      
      const client = ModelClient(
        "https://models.inference.ai.azure.com",
        new AzureKeyCredential(this.azureApiKey)
      );

      const response = await client.path("/chat/completions").post({
        body: {
          messages: [
            { 
              role: "system", 
              content: "You are an AI real estate expert assistant that provides concise, accurate analysis of property data."
            },
            { 
              role: "user", 
              content: prompt 
            }
          ],
          model: "gpt-4o",
          temperature: 0.7,
          max_tokens: 800,
          top_p: 1
        }
      });

      const endTime = Date.now();
      console.log(`Azure AI generation completed in ${(endTime - startTime) / 1000} seconds`);

      if (isUnexpected(response)) {
        throw new Error(response.body.error.message || "Azure API error");
      }
      
      return response.body.choices[0].message.content;
    } catch (error) {
      console.error("Error generating text with Azure:", error);
      return `Error: ${error.message}`;
    }
  }

  // Hugging Face API (Open source models)
  async generateTextWithHuggingFace(prompt) {
    try {
      if (!this.huggingfaceApiKey) {
        throw new Error("Hugging Face API key not configured");
      }

      console.log(`Starting Hugging Face generation at ${new Date().toISOString()}`);
      const startTime = Date.now();

      const response = await fetch(
        `https://api-inference.huggingface.co/models/${config.modelId}`,
        {
          headers: {
            Authorization: `Bearer ${this.huggingfaceApiKey}`,
            "Content-Type": "application/json"
          },
          method: "POST",
          body: JSON.stringify({
            inputs: `You are an AI real estate expert assistant. ${prompt}`,
            parameters: {
              max_new_tokens: 800,
              temperature: 0.7
            }
          })
        }
      );

      const data = await response.json();
      const endTime = Date.now();
      console.log(`Hugging Face generation completed in ${(endTime - startTime) / 1000} seconds`);

      if (!response.ok) {
        throw new Error(data.error || "Hugging Face API error");
      }
      
      return Array.isArray(data) && data[0]?.generated_text 
        ? data[0].generated_text 
        : JSON.stringify(data);
    } catch (error) {
      console.error("Error generating text with Hugging Face:", error);
      return `Error: ${error.message}`;
    }
  }

  // Helper method to filter and clean property data before analysis
  _preparePropertyData(properties, maxProperties = 3) {
    // Limit the number of properties
    const limitedProperties = properties.slice(0, maxProperties);
    
    // Clean and simplify each property
    return limitedProperties.map(property => ({
      building_name: property.building_name,
      property_type: property.property_type,
      location_address: property.location_address,
      price: property.price,
      area_sqft: property.area_sqft,
      // Extract just a few key amenities
      amenities: Array.isArray(property.amenities) 
        ? property.amenities.slice(0, 5) 
        : [],
      // Truncate description to save tokens
      description: property.description 
        ? property.description.substring(0, 150) + (property.description.length > 150 ? '...' : '')
        : ''
    }));
  }

  // Helper method to filter and clean location data
  _prepareLocationData(locations, maxLocations = 5) {
    // Limit the number of locations
    return locations.slice(0, maxLocations);
  }

  async analyzeProperties(
    properties,
    city,
    maxPrice,
    propertyCategory,
    propertyType
  ) {
    // Prepare limited and cleaned property data
    const preparedProperties = this._preparePropertyData(properties);

    const prompt = `As a real estate expert, analyze these properties:

        Properties Found in ${city}:
        ${JSON.stringify(preparedProperties, null, 2)}

        INSTRUCTIONS:
        1. Focus ONLY on these properties that match:
           - Property Category: ${propertyCategory}
           - Property Type: ${propertyType}
           - Maximum Price: ${maxPrice} crores
        2. Provide a brief analysis with these sections:
           - Property Overview (basic facts about each)
           - Best Value Analysis (which offers the best value)
           - Quick Recommendations

        Keep your response concise and focused on these properties only.
        `;

    return this.generateText(prompt);
  }

  async analyzeLocationTrends(locations, city) {
    // Prepare limited location data
    const preparedLocations = this._prepareLocationData(locations);

    const prompt = `As a real estate expert, analyze these location price trends for ${city}:

        ${JSON.stringify(preparedLocations, null, 2)}

        Please provide:
        1. A brief summary of price trends for each location
        2. Which areas are showing the highest appreciation
        3. Which areas offer the best rental yield
        4. Quick investment recommendations based on this data

        Keep your response concise (maximum 300 words).
        `;

    return this.generateText(prompt);
  }
}

export default new AIService();