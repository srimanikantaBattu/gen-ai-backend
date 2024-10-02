//create express mini user api App
const exp = require('express')
const quizApp = exp.Router()
const { ObjectId } = require('mongodb');

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

async function run(slokadata) {
    const prompt = `Create a quiz based on the following Content with 10 questions. Questions should ask the user to identify correct formula for a correct topic Not only formulas but also other content also. Provide the quiz in a plain JSON format with no additional text or markdown. The JSON should have the following structure:

    {
      "quiz": {
        "title": "Title of the quiz",
        "questions": [
          {
            "question": "The question text",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "answer": "The correct answer"
          }
          // Add more questions here
        ]
      }
    }

    The dataset is: ${slokadata}. Make sure the response only includes the JSON object as shown above, without any additional text or formatting. The answer should be in options and convert the data set into __dangerHTML format and give quiz from that data. Dont give any other texts just give JSON`;


    // Call the AI model with the generated prompt
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    try {
        // Clean the response by removing any unwanted formatting such as backticks
        const cleanedText = text.replace(/json|/g, '').trim();
        const cleanedText1 = cleanedText.replace(/`/g, '').trim();
        console.log(cleanedText1)
        // Parse the cleaned response text into JSON
        const parsedData = JSON.parse(cleanedText1);
        console.log(parsedData)
        console.log("Hello")
        // Check if the JSON has the expected structure
        if (parsedData && parsedData.quiz && Array.isArray(parsedData.quiz.questions)) {
            return parsedData.quiz.questions.map(question => ({
                question: question.question,
                options: question.options,
                answer: question.answer
            }));
        } else {
            console.warn('Unexpected JSON structure:', parsedData);
            return [];
        }
    } catch (error) {
        console.error('Error parsing JSON:', error);
        return [];
    }
}


async function getDatafromGemini(data) {
    const prompt = `Give the data related to ${data} subject And if subject is related to numerical , more focus on the Formulas etc.. Give Topic Wise and Give the holde data in a good HTML Content format with good styling such that the formulas should be displayed correctly. And Content should be more it should be around minimum of 10 paragraphs. And Just give about the data not explanation how you provided the content or how you provided the html format and dont give the starting line html. And display some other content related to that ${data} in the form of tables(Provide borderd good spacing while styling)`;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    return text.replace(/\*\*/g, '').replace(/\* /g, '\n* ').replace(/### /g, '\n');;; // Remove all instances of ** from the content
}
//import asynchrous handler to handle asynchronous error
const expressAsyncHandler = require('express-async-handler');

require('dotenv').config();


let slokas;
let gita;
let quizcollection;
//get userCollection this app level middleware--- it is required by every route
quizApp.use((req,res,next)=>{
    slokas = req.app.get('slokasObj')
    gita = req.app.get('gitaObj')
    quizcollection = req.app.get('quizObj')
    next()
})

quizApp.post('/create/:chapter', expressAsyncHandler(async (req, res) => {

    const { chapter } = req.params;

    console.log("HI");
    console.log(chapter)

    const quizArray = await run(chapter);


    // Generate a MongoDB ObjectId
    const quizId = new ObjectId(); // Creates a new MongoDB ObjectId

    // Store the quiz with its unique ID in the database
    const result = await quizcollection.insertOne({
        _id: quizId,
        questions: quizArray
    });

    console.log("insert resopnse",result)



    // Send the unique ID to the client
    res.send({ message: "Quiz created successfully", quiz: quizArray });
}));

quizApp.post('/hello', expressAsyncHandler(async (req, res) => {
    const data = req.body;
    const response = await getDatafromGemini(data.subjectName);
    res.send({ message: response });
}));
module.exports=quizApp;