import AppKit
import Vision

func recognize(_ path: String) throws -> String {
    guard let image = NSImage(contentsOfFile: path),
          let data = image.tiffRepresentation,
          let bitmap = NSBitmapImageRep(data: data),
          let cgImage = bitmap.cgImage else {
        throw NSError(domain: "battrochtek.ocr", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cannot decode \(path)"])
    }
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    request.recognitionLanguages = ["en-US", "fr-FR", "pt-BR", "es-ES"]
    try VNImageRequestHandler(cgImage: cgImage, options: [:]).perform([request])
    let observations = (request.results ?? []).sorted {
        let rowDelta = abs($0.boundingBox.midY - $1.boundingBox.midY)
        if rowDelta > 0.015 { return $0.boundingBox.midY > $1.boundingBox.midY }
        return $0.boundingBox.minX < $1.boundingBox.minX
    }
    return observations.compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
}

for path in CommandLine.arguments.dropFirst() {
    do {
        print("\n=== \(path) ===")
        print(try recognize(path))
    } catch {
        fputs("OCR error for \(path): \(error)\n", stderr)
    }
}
