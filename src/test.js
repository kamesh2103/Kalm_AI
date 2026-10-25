import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyBNLDMqIChfDemBARCbjhekqydhMgVujFE"; // ⬅️ Replace this

const listModels = async () => {
  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const models = await genAI.listModels();

    models.forEach((model) => {
      console.log("🧠 Model ID:", model.name);
      console.log("   Description:", model.description);
      console.log("   Input Token Limit:", model.inputTokenLimit);
      console.log("   Output Token Limit:", model.outputTokenLimit);
      console.log("   Supported Generation Methods:", model.supportedGenerationMethods);
      console.log("--------------------------------------------------");
    });
  } catch (error) {
    console.error("❌ Error listing models:", error);
  }
};

listModels();
