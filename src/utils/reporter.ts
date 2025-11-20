/**
 * Musubi - Report Generation
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { ClassificationResult, ClassificationReport } from '../types/index.js';
import { logger } from './logger.js';

export class Reporter {
  /**
   * Generate classification report
   */
  static generateReport(results: ClassificationResult[]): ClassificationReport {
    const byProject: Record<string, number> = {};
    let totalConfidence = 0;
    let lowConfidenceCount = 0;
    const lowConfidenceThreshold = 0.5;

    for (const result of results) {
      byProject[result.predictedProject] = (byProject[result.predictedProject] || 0) + 1;
      totalConfidence += result.confidence;
      
      if (result.confidence < lowConfidenceThreshold) {
        lowConfidenceCount++;
      }
    }

    const classified = results.filter(r => r.predictedProject !== 'uncategorized').length;
    const unclassified = results.filter(r => r.predictedProject === 'uncategorized').length;

    const report: ClassificationReport = {
      totalProcessed: results.length,
      classified,
      unclassified,
      accuracy: results.length > 0 ? classified / results.length : 0,
      errorRate: results.length > 0 ? unclassified / results.length : 0,
      results,
      summary: {
        byProject,
        avgConfidence: results.length > 0 ? totalConfidence / results.length : 0,
        lowConfidenceCount,
      },
    };

    return report;
  }

  /**
   * Print report to console
   */
  static printReport(report: ClassificationReport): void {
    logger.section('Classification Report');
    
    console.log(`📊 Total Processed: ${report.totalProcessed}`);
    console.log(`✅ Classified: ${report.classified} (${(report.accuracy * 100).toFixed(2)}%)`);
    console.log(`❓ Unclassified: ${report.unclassified} (${(report.errorRate * 100).toFixed(2)}%)`);
    console.log(`📈 Average Confidence: ${(report.summary.avgConfidence * 100).toFixed(2)}%`);
    console.log(`⚠️  Low Confidence (<50%): ${report.summary.lowConfidenceCount}`);
    
    console.log('\n📁 Distribution by Project:');
    for (const [project, count] of Object.entries(report.summary.byProject)) {
      const percentage = (count / report.totalProcessed * 100).toFixed(2);
      console.log(`   ${project}: ${count} (${percentage}%)`);
    }

    console.log('\n🎯 Success Criteria:');
    const meetsAccuracy = report.accuracy >= 0.9;
    const meetsErrorRate = report.errorRate <= 0.05;
    console.log(`   Accuracy ≥90%: ${meetsAccuracy ? '✅' : '❌'} (${(report.accuracy * 100).toFixed(2)}%)`);
    console.log(`   Error Rate ≤5%: ${meetsErrorRate ? '✅' : '❌'} (${(report.errorRate * 100).toFixed(2)}%)`);
  }

  /**
   * Save report to file
   */
  static saveReport(report: ClassificationReport, outputPath: string): void {
    try {
      // Save JSON report
      const jsonPath = join(outputPath, `classification-report-${Date.now()}.json`);
      writeFileSync(jsonPath, JSON.stringify(report, null, 2));
      logger.success(`Report saved to: ${jsonPath}`);

      // Save human-readable report
      const txtPath = join(outputPath, `classification-report-${Date.now()}.txt`);
      const txtContent = this.generateTextReport(report);
      writeFileSync(txtPath, txtContent);
      logger.success(`Text report saved to: ${txtPath}`);

      // Save CSV of results
      const csvPath = join(outputPath, `classification-results-${Date.now()}.csv`);
      const csvContent = this.generateCSV(report.results);
      writeFileSync(csvPath, csvContent);
      logger.success(`CSV results saved to: ${csvPath}`);
    } catch (error) {
      logger.error('Failed to save report', error);
    }
  }

  /**
   * Generate text report
   */
  private static generateTextReport(report: ClassificationReport): string {
    let text = 'MUSUBI - Classification Report\n';
    text += '='.repeat(60) + '\n\n';
    text += `Generated: ${new Date().toISOString()}\n\n`;
    
    text += 'SUMMARY\n';
    text += '-'.repeat(60) + '\n';
    text += `Total Processed: ${report.totalProcessed}\n`;
    text += `Classified: ${report.classified} (${(report.accuracy * 100).toFixed(2)}%)\n`;
    text += `Unclassified: ${report.unclassified} (${(report.errorRate * 100).toFixed(2)}%)\n`;
    text += `Average Confidence: ${(report.summary.avgConfidence * 100).toFixed(2)}%\n`;
    text += `Low Confidence (<50%): ${report.summary.lowConfidenceCount}\n\n`;
    
    text += 'DISTRIBUTION BY PROJECT\n';
    text += '-'.repeat(60) + '\n';
    for (const [project, count] of Object.entries(report.summary.byProject)) {
      const percentage = (count / report.totalProcessed * 100).toFixed(2);
      text += `${project}: ${count} (${percentage}%)\n`;
    }
    
    text += '\nSUCCESS CRITERIA\n';
    text += '-'.repeat(60) + '\n';
    const meetsAccuracy = report.accuracy >= 0.9;
    const meetsErrorRate = report.errorRate <= 0.05;
    text += `Accuracy ≥90%: ${meetsAccuracy ? 'PASS' : 'FAIL'} (${(report.accuracy * 100).toFixed(2)}%)\n`;
    text += `Error Rate ≤5%: ${meetsErrorRate ? 'PASS' : 'FAIL'} (${(report.errorRate * 100).toFixed(2)}%)\n`;
    
    return text;
  }

  /**
   * Generate CSV
   */
  private static generateCSV(results: ClassificationResult[]): string {
    let csv = 'Conversation ID,Original Project,Predicted Project,Confidence,Reason,Timestamp\n';
    
    for (const result of results) {
      csv += `"${result.conversationId}","${result.originalProject}","${result.predictedProject}",${result.confidence},"${result.reason.replace(/"/g, '""')}","${result.timestamp}"\n`;
    }
    
    return csv;
  }
}

