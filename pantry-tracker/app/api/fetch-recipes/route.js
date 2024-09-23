import { NextResponse } from 'next/server';

export async function POST(req) {
    const { pantryItems } = await req.json();
    console.log('Pantry items received in API route:', pantryItems);

    if (!pantryItems || pantryItems.length === 0) {
        return NextResponse.json({ error: 'No pantry items provided.' });
    }

    // Get the OpenAI API key from the environment
    const API_KEY = process.env.OPENAI_API_KEY;

    if (!API_KEY) {
        console.error('OPENAI_API_KEY is missing.');
        return NextResponse.json({ error: 'Missing API key.' });
    }

    // Call OpenAI API with the pantry items
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: `Give me recipe ideas based on these ingredients: ${pantryItems.join(', ')}. Just the recipe name` }
            ],
            max_tokens: 150,
            temperature: 0.7,
        }),
    });

    const data = await response.json();


    // Ensure the API response contains valid data
    let recipes = [];
    if (data && data.choices && data.choices.length > 0) {
        const messageContent = data.choices[0].message.content;


        // Split by double line break (if OpenAI returns multiple recipes) and treat each part as a single recipe block
        const recipeBlocks = messageContent.split('\n\n');

        // Save each block as one recipe with full content
        recipes = recipeBlocks.map((recipeText) => ({ content: recipeText }));
    }

    // Return the recipes as JSON response
    return NextResponse.json({ recipes });
}