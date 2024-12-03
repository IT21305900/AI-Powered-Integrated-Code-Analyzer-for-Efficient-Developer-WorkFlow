"use client";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

const Documentation = () => {
  const searchParams = useSearchParams();
  const repository = searchParams.get("repository");

  const [markdownContent, setMarkdownContent] = useState("");

  useEffect(() => {
    // Fetch the markdown file content
    fetch(`/${repository}.md`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch the markdown file.");
        }
        return response.text();
      })
      .then((text) => setMarkdownContent(text))
      .catch((error) => console.error("Error fetching markdown file:", error));
  }, []);

  return (
    <div>
      <h1>Documentation</h1>
      <ReactMarkdown>{markdownContent}</ReactMarkdown>
    </div>
  );
};

export default Documentation;
