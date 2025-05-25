import React, { useState, useEffect, useRef } from "react";
import CodeSmellCharts from "./CodeSmellChart";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface AnalysisResult {
  smell_type: string;
  file: string;
  line_number: string;
  suggestion: string;
}

const Feedback = () => {
  const [showCharts, setShowCharts] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    fetch(`http://4.240.106.235:5000/codesmelldata`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (
          Array.isArray(data) &&
          data.length > 0 &&
          data[0].analysis_results
        ) {
          const formattedResults = data[0].analysis_results.map(
            (smell: any) => ({
              smell_type: smell.smell,
              file: smell.file,
              line_number: smell.line_number,
              suggestion: smell.suggestion,
            })
          );
          setResults(formattedResults);
        } else {
          throw new Error("Unexpected API response format");
        }
      })
      .catch((error) => console.error("Error fetching results:", error));
  }, []);

  const implementationSmells = results.filter((result) =>
    [
      "dead_code",
      "duplicate_code",
      "long_methods",
      "unoptimized_loops",
    ].includes(result.smell_type)
  );
  const designSmells = results.filter((result) =>
    [
      "cyclic_dependency",
      "deficient_encapsulation",
      "imperative_abstraction",
      "wide_hierarchy",
    ].includes(result.smell_type)
  );

  const implementationCount = implementationSmells.length;
  const designCount = designSmells.length;

  const downloadPDF = async () => {
    const pdf = new jsPDF("p", "mm", "a4");
    const content = contentRef.current;

    if (!content) return;

    // Render the entire content section
    const canvas = await html2canvas(content, {
      useCORS: true,
      allowTaint: true,
      scale: 2, // higher quality
    });

    const imgData = canvas.toDataURL("image/png");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("CodeSmellFeedback.pdf");
  };

  return (
    <div className="p-8 bg-black min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">
          Code Smell Analysis & Feedback System
        </h2>
        <div className="flex space-x-2">
          <Button
            onClick={() => setShowCharts(!showCharts)}
            className="bg-white text-gray-900 font-semibold border border-gray-300 shadow-md px-6 py-2 hover:bg-gray-200 transition"
          >
            {showCharts ? "Back to Table" : "View Graphs"}
          </Button>
          <Button
            onClick={downloadPDF}
            className="bg-green-500 text-white font-semibold px-4 py-2 rounded hover:bg-green-600"
          >
            Download PDF
          </Button>
        </div>
      </div>

      <div ref={contentRef}>
        {!showCharts ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Implementation Smells */}
            <Card className="bg-gray-900 shadow-lg rounded-xl border border-blue-400">
              <CardHeader>
                <CardTitle className="text-white">
                  Implementation Smells
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-w-full">
                  <Table className="w-full border rounded-lg table-fixed">
                    <TableHeader className="bg-blue-400">
                      <TableRow>
                        <TableHead className="text-black font-semibold p-3 w-1/6">
                          Type
                        </TableHead>
                        <TableHead className="text-black font-semibold p-3 w-1/4">
                          File
                        </TableHead>
                        <TableHead className="text-black font-semibold p-3 w-1/6">
                          Line
                        </TableHead>
                        <TableHead className="text-black font-semibold p-3 w-1/2">
                          Feedback
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {implementationSmells.length > 0 ? (
                        implementationSmells.map((smell, index) => (
                          <TableRow key={index} className="border-b">
                            <TableCell className="text-white p-3 break-words">
                              {smell.smell_type}
                            </TableCell>
                            <TableCell className="text-white p-3 break-words">
                              {smell.file}
                            </TableCell>
                            <TableCell className="text-white p-3 break-words">
                              {smell.line_number}
                            </TableCell>
                            <TableCell className="text-white p-3 break-words max-w-xs whitespace-normal">
                              {smell.suggestion}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            className="text-center text-gray-400 p-4"
                            colSpan={4}
                          >
                            No Implementation Smells Detected.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Design Smells */}
            <Card className="bg-gray-900 shadow-lg rounded-xl border border-blue-400">
              <CardHeader>
                <CardTitle className="text-white">Design Smells</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-w-full">
                  <Table className="w-full border rounded-lg table-fixed">
                    <TableHeader className="bg-blue-400">
                      <TableRow>
                        <TableHead className="text-black font-semibold p-3 w-1/6">
                          Type
                        </TableHead>
                        <TableHead className="text-black font-semibold p-3 w-1/4">
                          File
                        </TableHead>
                        <TableHead className="text-black font-semibold p-3 w-1/6">
                          Line
                        </TableHead>
                        <TableHead className="text-black font-semibold p-3 w-1/2">
                          Feedback
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {designSmells.length > 0 ? (
                        designSmells.map((smell, index) => (
                          <TableRow key={index} className="border-b">
                            <TableCell className="text-white p-3 break-words">
                              {smell.smell_type}
                            </TableCell>
                            <TableCell className="text-white p-3 break-words">
                              {smell.file}
                            </TableCell>
                            <TableCell className="text-white p-3 break-words">
                              {smell.line_number}
                            </TableCell>
                            <TableCell className="text-white p-3 break-words max-w-xs whitespace-normal">
                              {smell.suggestion}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            className="text-center text-gray-400 p-4"
                            colSpan={4}
                          >
                            No Design Smells Detected.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // <CodeSmellCharts
          //   implementationCount={implementationCount}
          //   designCount={designCount}
          // />
          <div>
            <CodeSmellCharts
              implementationCount={implementationCount}
              designCount={designCount}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Feedback;
