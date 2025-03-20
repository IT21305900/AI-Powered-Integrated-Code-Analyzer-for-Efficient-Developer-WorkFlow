// reference.ts - Fixed to handle the correct JSON structure
import path from "path";
import { promises as fs } from "fs";

// Define types for documentation references
interface DocReference {
  title: string;
  url: string;
  description: string;
}

interface DocReferenceCategory {
  categoryName: string;
  references: DocReference[];
}

// Define a class to manage documentation references
class DocumentationReferenceManager {
  private referenceData: DocReferenceCategory[] = [];
  private referencesFilePath: string;
  private initialized: boolean = false;

  constructor(referencesPath?: string) {
    // Default to a JSON file in the public directory
    this.referencesFilePath =
      referencesPath || path.join(process.cwd(), "public", "references.json");
  }

  // Initialize by loading references from the JSON file
  async initialize(): Promise<void> {
    // Skip if already initialized
    if (this.initialized) {
      return;
    }

    try {
      const data = await fs.readFile(this.referencesFilePath, "utf-8");
      const parsedData = JSON.parse(data);

      // Verify the data structure is an array of DocReferenceCategory
      if (Array.isArray(parsedData)) {
        this.referenceData = parsedData;
      } else if (
        parsedData.referenceData &&
        Array.isArray(parsedData.referenceData)
      ) {
        // Handle case where data is wrapped in a 'referenceData' property
        this.referenceData = parsedData.referenceData;
      } else {
        // Fallback to default references if structure is invalid
        console.warn("References file has invalid structure, using defaults");
        this.referenceData = this.getDefaultReferences();
      }

      console.log("Successfully loaded documentation references");
    } catch (error) {
      // Check if it's a file not found error
      if ((error as any)?.code === "ENOENT") {
        console.log("References file not found, using default references");
      } else {
        console.error("Error loading references:", error);
      }

      // Initialize with default references if file doesn't exist or has errors
      this.referenceData = this.getDefaultReferences();

      // Try to save default references to file for future use
      try {
        await this.saveReferences();
      } catch (saveError) {
        console.log(
          "Note: Could not save default references to file:",
          saveError
        );
        // This is non-critical, we can continue even if saving fails
      }
    }

    this.initialized = true;
  }

  // Save current references to the JSON file
  async saveReferences(): Promise<void> {
    try {
      // Create the directory if it doesn't exist
      const directory = path.dirname(this.referencesFilePath);
      try {
        await fs.mkdir(directory, { recursive: true });
      } catch (mkdirError) {
        // Ignore directory already exists errors
        if ((mkdirError as any)?.code !== "EEXIST") {
          throw mkdirError;
        }
      }

      // Save the reference data as a plain array
      await fs.writeFile(
        this.referencesFilePath,
        JSON.stringify(this.referenceData, null, 2),
        "utf-8"
      );
      console.log("References saved successfully");
    } catch (error) {
      console.error("Error saving references:", error);
      // Still allow operation to continue even if save fails
    }
  }

  // Get references for specific categories
  getReferencesForCategories(categories: string[]): DocReference[] {
    // Debug log to see the structure of referenceData
    console.log(`Looking for categories: ${categories.join(", ")}`);
    console.log(`Reference data type: ${typeof this.referenceData}`);
    console.log(`Is array: ${Array.isArray(this.referenceData)}`);

    if (!Array.isArray(this.referenceData)) {
      console.error("Reference data is not an array");
      return [];
    }

    const matchedReferences: DocReference[] = [];

    categories.forEach((category) => {
      try {
        const matchedCategory = this.referenceData.find(
          (cat) => cat.categoryName.toLowerCase() === category.toLowerCase()
        );

        if (matchedCategory && Array.isArray(matchedCategory.references)) {
          matchedReferences.push(...matchedCategory.references);
        }
      } catch (error) {
        console.error(`Error finding category ${category}:`, error);
      }
    });

    return matchedReferences;
  }

  // Generate markdown for references
  generateReferencesMarkdown(categories: string[]): string {
    if (!this.initialized) {
      console.warn(
        "Warning: Reference manager not initialized before generating markdown"
      );
      return ""; // Return empty string rather than failing
    }

    if (!Array.isArray(this.referenceData)) {
      console.error("Reference data is not an array");
      return "";
    }

    const references = this.getReferencesForCategories(categories);

    if (references.length === 0) {
      return "";
    }

    let markdown = "\n\n### Official Documentation References\n\n";

    references.forEach((ref) => {
      markdown += `* [${ref.title}](${ref.url}) - ${ref.description}\n`;
    });

    return markdown;
  }

  // Add a new reference to a category
  async addReference(category: string, reference: DocReference): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!Array.isArray(this.referenceData)) {
      this.referenceData = this.getDefaultReferences();
    }

    const categoryIndex = this.referenceData.findIndex(
      (cat) => cat.categoryName.toLowerCase() === category.toLowerCase()
    );

    if (categoryIndex >= 0) {
      this.referenceData[categoryIndex].references.push(reference);
    } else {
      this.referenceData.push({
        categoryName: category,
        references: [reference],
      });
    }

    await this.saveReferences();
  }

  // Default references used if no file exists
  private getDefaultReferences(): DocReferenceCategory[] {
    return [
      {
        categoryName: "nextjs",
        references: [
          {
            title: "Next.js Documentation",
            url: "https://nextjs.org/docs",
            description: "Official Next.js documentation",
          },
          {
            title: "Learn Next.js",
            url: "https://nextjs.org/learn",
            description: "Interactive Next.js tutorial",
          },
        ],
      },
      {
        categoryName: "appRouter",
        references: [
          {
            title: "Next.js App Router",
            url: "https://nextjs.org/docs/app",
            description: "Official documentation for the App Router",
          },
          {
            title: "Defining Routes",
            url: "https://nextjs.org/docs/app/building-your-application/routing/defining-routes",
            description: "Learn how to define routes in Next.js App Router",
          },
          {
            title: "Dynamic Routes",
            url: "https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes",
            description: "Working with dynamic routes in Next.js",
          },
        ],
      },
      {
        categoryName: "react",
        references: [
          {
            title: "React Documentation",
            url: "https://react.dev/",
            description: "Official React documentation",
          },
          {
            title: "React Hooks",
            url: "https://react.dev/reference/react",
            description: "Official documentation for React Hooks",
          },
        ],
      },
      {
        categoryName: "tailwind",
        references: [
          {
            title: "Tailwind CSS Documentation",
            url: "https://tailwindcss.com/docs",
            description: "Official Tailwind CSS documentation",
          },
          {
            title: "Tailwind CSS with Next.js",
            url: "https://tailwindcss.com/docs/guides/nextjs",
            description: "Guide for using Tailwind CSS with Next.js",
          },
        ],
      },
      {
        categoryName: "middleware",
        references: [
          {
            title: "Next.js Middleware",
            url: "https://nextjs.org/docs/middleware",
            description: "Documentation for Next.js Middleware",
          },
        ],
      },
    ];
  }
}

// Create a singleton instance
export const referenceManager = new DocumentationReferenceManager();

// Helper function to get references markdown for use in agents
export async function getReferencesMarkdown(
  categories: string[]
): Promise<string> {
  try {
    await referenceManager.initialize();
    return referenceManager.generateReferencesMarkdown(categories);
  } catch (error) {
    console.error("Error getting references markdown:", error);
    return ""; // Return empty string on error rather than failing
  }
}

// Export the class for potential direct usage
export { DocumentationReferenceManager };
