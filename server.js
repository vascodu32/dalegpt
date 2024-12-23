const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Serve static files from the public directory
app.use(express.static('public'));

// Route for the home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Function to call OpenAI API
async function getEthicalResponse(model, scenario) {
    try {
        const response = await axios.post(OPENAI_API_URL, {
            model: model,
            messages: [{ role: 'user', content: scenario }],
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
        });
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error calling OpenAI API:', error);
        return 'There was an error generating a response.';
    }
}

// Virtue Ethics endpoint and prompt
const VIRTUE_ETHICS_PROMPT = `You are an AI ethics assistant that follows Virtue Ethics.
Evaluate decisions based on character and values, focusing on what a virtuous person would do.
When given a scenario:
1. Identify the virtues relevant to this situation (e.g., courage, honesty, compassion)
2. Consider what character traits would be demonstrated or developed
3. Evaluate how the action aligns with these virtues
4. Recommend the action that best expresses moral excellence

Current scenario: `;

app.post('/api/virtue-ethics', async (req, res) => {
    try {
        if (req.body.dilemma1) {
            // Handle initial dilemma responses
            const analysisPrompt = `
                Based on the following responses to ethical dilemmas, identify the top three values that guide this person's decision making:

                Corporate Downsizing Response:
                ${req.body.dilemma1}

                Reporting Unethical Behavior Response:
                ${req.body.dilemma2}

                Environmental Sustainability Response:
                ${req.body.dilemma3}

                Please analyze these responses and return exactly three core values in the following format:
                VALUE1: [First Value]
                VALUE2: [Second Value]
                VALUE3: [Third Value]
            `;

            const response = await getEthicalResponse('gpt-3.5-turbo', analysisPrompt);
            
            // Parse the response to extract values
            const values = response
                .split('\n')
                .filter(line => line.includes('VALUE'))
                .map(line => line.split(':')[1].trim());

            res.json({ 
                values: values.join(','),
                response: response 
            });
        } else if (req.body.scenario && req.body.values) {
            // Handle advice requests
            const advicePrompt = `
                Given a person with these core values: ${req.body.values}
                
                Please provide advice for this scenario: ${req.body.scenario}
                
                The advice should:
                1. Explicitly reference how each value applies to the situation
                2. Provide specific recommendations aligned with these values
                3. Explain the reasoning behind the advice
            `;
            
            const response = await getEthicalResponse('gpt-3.5-turbo', advicePrompt);
            res.json({ response });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// Deontology endpoint and prompt
const DEONTOLOGY_PROMPT = `You are an AI ethics assistant that follows Deontological (rule-based) ethics.
Evaluate decisions based ONLY on rules and principles, regardless of consequences.
When given a scenario:
1. Ask what rules or principles are relevant
2. Evaluate if the action follows or violates these rules
3. Make a decision based purely on rule adherence
4. Explicitly ignore outcomes in your reasoning

Current scenario: `;

app.post('/api/deontology', async (req, res) => {
    const fullPrompt = DEONTOLOGY_PROMPT + req.body.scenario;
    const response = await getEthicalResponse('gpt-3.5-turbo', fullPrompt);
    res.json({ response });
});

// Utilitarian endpoint and prompt
const UTILITARIAN_PROMPT = `You are an AI ethics assistant that follows Utilitarian ethics.
Evaluate decisions based ONLY on their consequences and outcomes.
When given a scenario:
1. Identify all stakeholders affected
2. Analyze potential benefits and harms for each group
3. Calculate the net benefit/harm
4. Recommend the action that produces the greatest good for the greatest number

Current scenario: `;

app.post('/api/utilitarianism', async (req, res) => {
    const fullPrompt = UTILITARIAN_PROMPT + req.body.scenario;
    const response = await getEthicalResponse('gpt-3.5-turbo', fullPrompt);
    res.json({ response });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
