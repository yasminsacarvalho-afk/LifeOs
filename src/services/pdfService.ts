export interface PDFData {
  titulo: string;
  conteudo: string;
  categoria: string;
  tags: string[];
  criadoEm: string;
  autor: string;
}

export const pdfService = {
  exportarAnotacaoPDF: async (data: PDFData): Promise<string> => {
    const url = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
    
    if (!url) {
      throw new Error("VITE_GOOGLE_SCRIPT_URL não está configurada.");
    }

    // A requisição usa POST e envia os dados como JSON, conforme especificado
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain", // Google Apps Script handles text/plain better to avoid CORS preflight, but let's try application/json first or text/plain depending on how the Apps Script was written. If it uses doPost(e), e.postData.contents has the JSON.
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
       throw new Error("Erro ao gerar o PDF.");
    }

    const result = await response.json();
    
    if (result.error) {
       throw new Error(result.error);
    }
    
    return result.pdfUrl || result.url || result.fileUrl;
  },

  abrirPDF: (url: string) => {
    window.open(url, "_blank");
  },

  baixarPDF: (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = "Anotacao.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};
