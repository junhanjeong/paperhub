import * as webllm from "@mlc-ai/web-llm";

let engine: webllm.MLCEngine | null = null;

// 워커가 메시지를 받았을 때의 처리
self.onmessage = async (e: MessageEvent) => {
    const { type, data } = e.data;

    if (type === "load") {
        try {
            // WebLLM 엔진 초기화
            engine = new webllm.MLCEngine();

            // 모델 로드 (진행 상황 콜백 포함)
            await engine.reload(data.modelId || "Qwen2.5-3B-Instruct-q4f16_1-MLC", {
                initProgressCallback: (progress: webllm.InitProgressReport) => {
                    self.postMessage({
                        type: "progress",
                        data: {
                            progress: progress.progress * 100,
                            text: progress.text
                        }
                    });
                }
            });

            self.postMessage({ type: "status", data: "ready" });
        } catch (error: any) {
            console.error("Worker Model Load Error:", error);
            self.postMessage({ type: "error", data: error.message || "모델 로딩 실패" });
        }
    }

    if (type === "generate") {
        if (!engine) {
            self.postMessage({ type: "error", data: "모델이 아직 로드되지 않았습니다." });
            return;
        }

        const { messages, systemPrompt } = data;

        try {
            // OpenAI 호환 메시지 형식으로 변환
            const chatMessages: webllm.ChatCompletionMessageParam[] = [
                { role: "system", content: systemPrompt },
                ...messages.map((m: any) => ({
                    role: m.role as "user" | "assistant",
                    content: m.content
                }))
            ];

            // 스트리밍 생성
            const asyncChunkGenerator = await engine.chat.completions.create({
                messages: chatMessages,
                temperature: 0.7,
                max_tokens: 1024,
                stream: true,
                stream_options: { include_usage: true },
            });

            for await (const chunk of asyncChunkGenerator) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                    self.postMessage({ type: "chunk", data: content });
                }
            }

            self.postMessage({ type: "done" });
        } catch (error: any) {
            console.error("Worker Generation Error:", error);
            self.postMessage({ type: "error", data: error.message || "텍스트 생성 실패" });
        }
    }

    if (type === "abort") {
        try {
            engine?.interruptGenerate();
        } catch (e) {
            console.warn("Abort failed:", e);
        }
    }
};
