"use client";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

const Documentation = () => {
  const searchParams = useSearchParams();
  const [error, setError] = useState(false);
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
      .catch((error) => setError(true));
  }, []);

  return (
    <div>
      <div className="border-b py-1">
        <p className="lead mx-5">Documentation for {repository} Repository</p>
      </div>

      {error ? (
        <div className="m-10 text-center font-medium">
          <p className="">
            Not Found Documentation for the selected {repository} project
            repository
          </p>

          <p className="">
            You can run the documentation generation pipeline to generate
            documentation
          </p>
        </div>
      ) : (
        <ReactMarkdown>{markdownContent}</ReactMarkdown>
      )}
    </div>
  );
};

export default Documentation;
