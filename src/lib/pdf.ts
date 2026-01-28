export async function extractTextFromPDF(file: File): Promise<string> {
    try {
        // v4, v5 버전에서는 mjs 확장을 사용하거나 특정 경로를 지정해야 함
        // @ts-ignore
        const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');

        // worker 설정 (CDN 사용)
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;
        }

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            useSystemFonts: true,
            disableFontFace: true
        });

        const pdf = await loadingTask.promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            // @ts-ignore
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n';
        }

        return fullText;
    } catch (error) {
        console.error('PDF 추출 에러:', error);
        throw error;
    }
}
