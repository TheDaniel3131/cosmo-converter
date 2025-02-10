import { NextResponse, NextRequest } from "next/server";
import sharp from "sharp";
import mammoth from "mammoth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function POST(request: NextRequest) {
  try {
    const { fileData, fileType, format, fileName } = await request.json();

    if (!fileData || !fileType || !format) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(fileData, "base64");

    if (fileType.includes("image/")) {
      // Image conversion
      const result = await sharp(fileBuffer)
        .toFormat(format as keyof sharp.FormatEnum)
        .toBuffer();

      return NextResponse.json({
        convertedData: result.toString("base64"),
        fileName: `converted.${format}`,
      });
    } else if (
      fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileType === "application/msword"
    ) {
      // Word to PDF conversion
      if (format !== "pdf") {
        return NextResponse.json(
          { error: "Only PDF conversion supported for Word documents" },
          { status: 400 }
        );
      }

      // Extract text from docx
      const { value: text } = await mammoth.extractRawText({ buffer: fileBuffer });

      // Create PDF using pdf-lib
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      page.drawText(text, {
        x: 50,
        y: height - 100,
        maxWidth: width - 100,
        size: 12,
        font: font,
        color: rgb(0, 0, 0),
      });

      const pdfBytes = await pdfDoc.save();

      return NextResponse.json({
        convertedData: Buffer.from(pdfBytes).toString("base64"),
        fileName: `${fileName.split('.')[0]}.pdf`,
      });
    }

    return NextResponse.json(
      { error: "Unsupported file type or conversion" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Conversion error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Conversion failed",
      details: error 
    }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";