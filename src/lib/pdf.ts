export async function extractTextFromPDF(file: File): Promise<string> {
    try {
        // pdf.mjs를 직접 가져옵니다.
        const pdfjsLib = await import('pdfjs-dist');

        // 라이브러리 버전과 정확히 일치하는 워커를 사용해야 합니다.
        // unpkg는 npm 패키지의 모든 버전을 제공하므로 가장 확실합니다.
        const PDFJS_VERSION = '5.4.530';
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();

        // PDF 문서 로딩
        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            useSystemFonts: true,
            disableFontFace: true,
        });

        const pdf = await loadingTask.promise;
        let fullText = '';

        // 각 페이지에서 텍스트 추출
        for (let i = 1; i <= pdf.numPages; i++) {
            try {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();

                // @ts-ignore
                const pageText = textContent.items
                    .map((item: any) => item.str || '')
                    .join(' ');

                fullText += pageText + '\n';

                // 메모리 해제 지원
                page.cleanup();
            } catch (pageErr) {
                console.warn(`${i}페이지 추출 실패:`, pageErr);
                continue; // 한 페이지 실패해도 계속 진행
            }
        }

        if (!fullText.trim()) {
            throw new Error('문서에서 추출된 텍스트가 없습니다. 이미지로 된 PDF일 수 있습니다.');
        }

        return fullText;
    } catch (error: any) {
        console.error('PDF 추출 상세 에러:', error);
        // 사용자에게 더 구체적인 실패 원인 전달 가능하도록 에러 재전달
        throw error;
    }
}
