
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface PaymentReceivedEmailProps {
  customerName: string;
  invoiceNumber: string;
  amountPaid: number;
  invoiceTotal: number;
}

export const PaymentReceivedEmail = ({
  customerName,
  invoiceNumber,
  amountPaid,
  invoiceTotal,
}: PaymentReceivedEmailProps) => (
  <Html>
    <Head />
    <Preview>Payment Received for Invoice {invoiceNumber}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Payment Received</Heading>
        <Text style={text}>Dear {customerName},</Text>
        <Text style={text}>
          Thank you for your payment of ${amountPaid.toFixed(2)} for invoice {invoiceNumber}.
        </Text>
        <Section style={section}>
          <Text style={text}>
            <strong>Invoice Details:</strong><br />
            Invoice Number: {invoiceNumber}<br />
            Amount Paid: ${amountPaid.toFixed(2)}<br />
            Total Invoice Amount: ${invoiceTotal.toFixed(2)}
          </Text>
        </Section>
        <Text style={text}>
          We appreciate your business!
        </Text>
      </Container>
    </Body>
  </Html>
);

export default PaymentReceivedEmail;

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
};

const section = {
  padding: '24px',
  backgroundColor: '#f7f7f7',
  borderRadius: '4px',
  margin: '16px 0',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
};
