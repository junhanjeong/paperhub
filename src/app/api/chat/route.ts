import { createOllama } from 'ollama-ai-provider';
import { streamText } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
    try {
        const { messages, context } = await req.json();

        const ollama = createOllama({
            baseURL: 'http://localhost:11434/api',
        });

        const systemPrompt = context
            ? `당신은 연구 보조 AI입니다. 다음 제공된 문서 내용을 바탕으로 답변하세요.\n\n[문서 내용]\n${context}`
            : "당신은 연구 보조 AI입니다. 연구와 관련된 질문에 전문적이고 친절하게 답변하세요.";

        const result = await streamText({
            model: ollama('qwen3:4b-instruct-2507-q4_K_M') as any,
            system: systemPrompt,
            messages,
        });

        return result.toDataStreamResponse();
    } catch (error: any) {
        console.error('Chat API Error:', error);
        return new Response(
            JSON.stringify({
                error: 'Ollama 연결 실패. Ollama가 실행 중이고 qwen3 모델이 있는지 확인하세요.',
                details: error.message
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
