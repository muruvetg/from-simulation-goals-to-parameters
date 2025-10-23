import fs from 'fs';
import path from 'path';

export class DataLoader {
  static loadSimulationParameters(): string {
    try {
      const filePath = path.join(process.cwd(), 'data', 'simulation-parameters.json');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return fileContent;
    } catch (error) {
      console.error('Error loading simulation parameters:', error);
      return '';
    }
  }

  static loadParametersToGoalsTable(): string {
    try {
      const filePath = path.join(process.cwd(), 'data', 'ParametersToGoalsTable.csv');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return fileContent;
    } catch (error) {
      console.error('Error loading ParametersToGoalsTable.csv:', error);
      return '';
    }
  }

  static loadCSVFile(filename: string): string {
    try {
      const filePath = path.join(process.cwd(), 'data', filename);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return fileContent;
    } catch (error) {
      console.error(`Error loading CSV file ${filename}:`, error);
      return '';
    }
  }
}