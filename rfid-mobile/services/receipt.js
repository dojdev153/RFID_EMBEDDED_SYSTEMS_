import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

class ReceiptService {
    async generateReceipt(data, type) {
        const isTopUp = type === 'TOPUP';
        const transactionId = `TXN-${Date.now()}`;
        const dateStr = new Date().toLocaleString();

        const htmlContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #7c7cff; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #7c7cff; letter-spacing: 2px; }
            .title { font-size: 20px; font-weight: bold; margin-top: 10px; text-transform: uppercase; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 14px; color: #777; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .label { font-weight: bold; color: #555; }
            .value { color: #000; }
            .amount-section { background-color: #f9f9ff; padding: 20px; border-radius: 8px; margin-top: 30px; }
            .total-row { display: flex; justify-content: space-between; font-size: 22px; font-weight: bold; color: #7c7cff; margin-top: 10px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
            .qr-placeholder { margin-top: 20px; text-align: center; font-style: italic; color: #ccc; }
            .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100px; color: rgba(124, 124, 255, 0.05); z-index: -1; pointer-events: none; }
          </style>
        </head>
        <body>
          <div class="watermark">OFFICIAL</div>
          <div class="header">
            <div class="logo">^_^ TOPDOG RFID</div>
            <div class="title">${isTopUp ? 'Top-Up Receipt' : 'Payment Receipt'}</div>
          </div>

          <div class="section">
            <div class="section-title">Transaction Info</div>
            <div class="row"><div class="label">Receipt No:</div><div class="value">${transactionId}</div></div>
            <div class="row"><div class="label">Date:</div><div class="value">${dateStr}</div></div>
            <div class="row"><div class="label">Status:</div><div class="value" style="color: #4ade80; font-weight: bold;">SUCCESSFUL</div></div>
          </div>

          <div class="section">
            <div class="section-title">Party Details</div>
            <div class="row"><div class="label">${isTopUp ? 'Agent' : 'Salesperson'}:</div><div class="value">${data.username || 'System User'}</div></div>
            <div class="row"><div class="label">Customer/Card ID:</div><div class="value">${data.uid}</div></div>
            ${data.phoneNumber ? `<div class="row"><div class="label">Phone Number:</div><div class="value">${data.phoneNumber}</div></div>` : ''}
          </div>

          <div class="section">
            <div class="section-title">Payment Details</div>
            <div class="row"><div class="label">Method:</div><div class="value">RFID Wallet</div></div>
            ${!isTopUp ? `
              <div class="row"><div class="label">Category:</div><div class="value">${data.category || 'N/A'}</div></div>
              <div class="row"><div class="label">Service:</div><div class="value">${data.serviceName || 'N/A'}</div></div>
            ` : ''}
            ${isTopUp ? `
              <div class="row"><div class="label">Previous Balance:</div><div class="value">${data.balance_before || 0} RWF</div></div>
              <div class="row"><div class="label">Current Balance:</div><div class="value">${data.balance_after || 0} RWF</div></div>
            ` : ''}
          </div>

          <div class="amount-section">
            <div class="total-row">
              <div>Total Amount</div>
              <div>${data.amount} RWF</div>
            </div>
          </div>

          <div class="qr-placeholder">
            [ Verified Digital Transaction ]
          </div>

          <div class="footer">
            <p>Thank you for using TopDog RFID Payment System!</p>
            <p>123 Innovation Way, Kigali, Rwanda | +250 123 456 789</p>
            <p>www.topdog-rfid.rw</p>
          </div>
        </body>
      </html>
    `;

        try {
            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            const filename = `${isTopUp ? 'TopUp' : 'Receipt'}_${data.uid}_${Date.now()}.pdf`;

            if (Platform.OS === 'ios') {
                await Sharing.shareAsync(uri);
            } else {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Download Receipt',
                    UTI: 'com.adobe.pdf',
                });
            }
            return uri;
        } catch (error) {
            console.error('Error generating PDF:', error);
            throw error;
        }
    }

    async printReceipt(data, type) {
        // Similar to generate but uses Print.printAsync directly if possible, 
        // but usually printToFile + share is more flexible for mobile.
        // For now we'll just reuse the HTML logic but use printAsync.
        const isTopUp = type === 'TOPUP';
        const html = `<html>...same as above...</html>`; // Simplified for now
        await Print.printAsync({ html });
    }
}

export default new ReceiptService();
