const { Incident } = require('../models');
const PDFDocument = require('pdfkit');
const logger = require('../config/logger');

const generateSafetyReport = async (req, res) => {
  try {
    const incidents = await Incident.findAll({
      order: [['date', 'DESC']],
      limit: 2000
    });

    const doc = new PDFDocument({ margin: 50 });

    // Stream PDF directly to Express response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Jagriti_Safety_Report.pdf');
    doc.pipe(res);

    // Header styling
    doc.fillColor('#0f172a').fontSize(24).font('Helvetica-Bold').text('JAGRITI SAFETY REPORT', { align: 'center' });
    doc.fontSize(10).fillColor('#64748b').text(`Generated on: ${new Date().toLocaleDateString()} | Focus Area: National Safety Registry`, { align: 'center' });
    doc.moveDown(1.5);

    // Draw horizontal separator
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(1.5);

    // Calculate stats
    const totalCount = incidents.length;
    const stats = { theft: 0, harassment: 0, assault: 0, suspicious: 0, other: 0 };
    const cityStats = {};
    const sources = { community: 0, nlp: 0, ncrb: 0 };

    incidents.forEach(inc => {
      if (stats[inc.type] !== undefined) stats[inc.type]++;
      else stats.other++;

      const city = inc.city || 'Unknown Location';
      cityStats[city] = (cityStats[city] || 0) + 1;

      const src = inc.source || 'community';
      if (sources[src] !== undefined) sources[src]++;
    });

    // Overview section
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('1. Executive Overview');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#334155').text(
      `This safety intelligence dossier aggregates telemetry from live incident reporting, scraped media feeds, and the National Crime Records Bureau (NCRB) dataset. Currently, the Jagriti database tracks a total of ${totalCount} safety alerts.`,
      { lineGap: 4 }
    );
    doc.moveDown(1.5);

    // Draw Summary Grid
    const gridY = doc.y;
    doc.rect(50, gridY, 160, 60).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.rect(220, gridY, 160, 60).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.rect(390, gridY, 172, 60).fillAndStroke('#f8fafc', '#e2e8f0');

    // Grid Text
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('TOTAL DATA POINTS', 60, gridY + 12);
    doc.fillColor('#0f172a').fontSize(16).text(totalCount.toString(), 60, gridY + 26);

    doc.fillColor('#64748b').fontSize(8).text('COMMUNITY VERIFIED', 230, gridY + 12);
    doc.fillColor('#10b981').fontSize(16).text(incidents.filter(i => i.isVerified).length.toString(), 230, gridY + 26);

    doc.fillColor('#64748b').fontSize(8).text('CRITICAL ALERTS', 400, gridY + 12);
    doc.fillColor('#ef4444').fontSize(16).text((stats.assault + stats.harassment).toString(), 400, gridY + 26);

    doc.y = gridY + 80;
    doc.x = 50;

    // Breakdown Section
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('2. Alert Breakdown by Category');
    doc.moveDown(0.5);

    const categories = [
      { name: 'Assault & Violence', count: stats.assault, color: '#dc2626' },
      { name: 'Harassment & Stalking', count: stats.harassment, color: '#ef4444' },
      { name: 'Suspicious Activity', count: stats.suspicious, color: '#eab308' },
      { name: 'Theft & Robbery', count: stats.theft, color: '#f97316' },
      { name: 'Other Security Issues', count: stats.other, color: '#94a3b8' }
    ];

    categories.forEach(cat => {
      const percentage = totalCount > 0 ? ((cat.count / totalCount) * 100).toFixed(1) : 0;
      
      const barY = doc.y;
      doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold').text(`${cat.name}: ${cat.count} (${percentage}%)`, 50, barY);
      
      doc.rect(280, barY - 2, 200, 8).fill('#e2e8f0');
      if (cat.count > 0) {
        const fillWidth = (cat.count / totalCount) * 200;
        doc.rect(280, barY - 2, fillWidth, 8).fill(cat.color);
      }
      doc.moveDown(0.8);
    });

    doc.y += 10;
    doc.x = 50;

    // Top Cities
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('3. Hotspot Analysis (Highest Incidents)');
    doc.moveDown(0.5);

    const sortedCities = Object.entries(cityStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (sortedCities.length === 0) {
      doc.fillColor('#64748b').fontSize(10).font('Helvetica').text('No active geo-clusters registered in system yet.');
    } else {
      sortedCities.forEach(([city, count], idx) => {
        doc.fillColor('#334155').fontSize(10).font('Helvetica').text(
          `${idx + 1}. ${city} — ${count} reported incidents`,
          { indent: 10 }
        );
        doc.moveDown(0.3);
      });
    }

    // Disclaimer footer
    doc.moveDown(3);
    doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(1);
    doc.fillColor('#94a3b8').fontSize(7).font('Helvetica').text(
      'This report is generated dynamically by the Jagriti safety analytics core. The information represented here consists of open-source NLP news extractions, verified community alerts, and official government datasets. It is meant to provide localized situational awareness and is not a substitute for active law enforcement logs.',
      { align: 'center', lineGap: 2 }
    );

    doc.end();
  } catch (error) {
    logger.error('Error generating PDF report:', error);
    res.status(500).json({ status: 'error', message: 'Failed to generate report' });
  }
};

module.exports = {
  generateSafetyReport
};
