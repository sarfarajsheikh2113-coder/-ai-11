
export default async (request) => {
  // Only allow POST requests
  if (request.method !== "POST") {
    return Response.json(
      { error: "শুধু POST request অনুমোদিত।" },
      { status: 405 }
    );
  }

  try {
    const apiKey = Netlify.env.get("OPENAI_API_KEY");
    const model =
      Netlify.env.get("OPENAI_MODEL") || "gpt-4.1-mini";

    if (!apiKey) {
      return Response.json(
        { error: "AI সার্ভার কনফিগার করা হয়নি।" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const messages = body.messages;

    if (
      !Array.isArray(messages) ||
      messages.length < 1 ||
      messages.length > 8
    ) {
      return Response.json(
        { error: "সঠিক কথোপকথন পাঠাও।" },
        { status: 400 }
      );
    }

    const validMessages = messages.every(
      (m) =>
        m &&
        ["user", "assistant"].includes(m.role) &&
        typeof m.content === "string" &&
        m.content.length <= 700
    );

    if (!validMessages) {
      return Response.json(
        { error: "মেসেজের ফরম্যাট সঠিক নয়।" },
        { status: 400 }
      );
    }

    const conversation = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          instructions: `
তুমি MAHIR KIDS-এর AI শিক্ষক মাহির।
তোমার শিক্ষার্থীদের বয়স ৩ থেকে ১০ বছর।
তুমি বন্ধুসুলভ, ধৈর্যশীল এবং আনন্দের সঙ্গে শেখাবে।

বাংলা, ইংরেজি, আরবি বর্ণমালা,
সংখ্যা, রং, পশুপাখি, শব্দ ও সাধারণ জ্ঞান শেখাও।

শিশু বাংলায় প্রশ্ন করলে বাংলায় উত্তর দাও।
ইংরেজিতে প্রশ্ন করলে সহজ ইংরেজিতে উত্তর দাও।
আরবিতে প্রশ্ন করলে সহজ আরবিতে উত্তর দাও।

উত্তর ছোট, সহজ ও শিশুদের উপযোগী রাখবে।
ভুল করলে বকবে না, সুন্দরভাবে সংশোধন করবে।
শিশুর নাম, ঠিকানা, ফোন নম্বর বা ব্যক্তিগত তথ্য চাইবে না।
বিপজ্জনক কাজ শেখাবে না।
`,
          input: conversation,
          max_output_tokens: 250,
          store: false
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);
      return Response.json(
        { error: "AI শিক্ষক এখন উত্তর দিতে পারছে না। পরে আবার চেষ্টা করো।" },
        { status: 502 }
      );
    }

    const answer =
      data.output
        ?.flatMap((item) => item.content || [])
        ?.filter((item) => item.type === "output_text")
        ?.map((item) => item.text)
        ?.join("") || "";

    if (!answer) {
      return Response.json(
        { error: "AI থেকে কোনো উত্তর পাওয়া যায়নি।" },
        { status: 502 }
      );
    }

    return Response.json({ answer });

  } catch (error) {
    console.error("Teacher function error:", error);

    return Response.json(
      { error: "সার্ভারে সমস্যা হয়েছে। আবার চেষ্টা করো।" },
      { status: 500 }
    );
  }
};
