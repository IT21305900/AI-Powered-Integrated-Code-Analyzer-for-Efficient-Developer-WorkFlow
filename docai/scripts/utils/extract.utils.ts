export const saveMetadataToFile = async (
  filePath: string,
  metadata: Record<string, any>
) => {
  // For actual file paths, create a relative path
  const isActualFile = !filePath.includes("-") && fs.existsSync(filePath);

  const jsonFileName = isActualFile
    ? path.join(
        segmentsFolder,
        path.relative(process.cwd(), filePath).replace(/[/\\]/g, "_") + ".json"
      )
    : path.join(segmentsFolder, `${filePath}.json`);

  try {
    // Use fs.promises for asynchronous file writing
    await fs.promises.writeFile(
      jsonFileName,
      JSON.stringify(metadata, null, 2),
      "utf-8"
    );
  } catch (error) {
    console.error(`Error saving metadata file ${jsonFileName}:`, error);
  }
};
