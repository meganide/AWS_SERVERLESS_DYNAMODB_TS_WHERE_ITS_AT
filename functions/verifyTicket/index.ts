import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sendResponse } from '../../responses/index.ts';
import { db } from '../../services/db.ts';
import { AWSError } from 'aws-sdk/lib/error';

export const handler = async (event: APIGatewayProxyEvent, context: APIGatewayProxyResult) => {
  const { ticketId } = event.pathParameters;

  try {
    const ticket = await getTicketById(ticketId);

    if (!ticket) {
      return sendResponse(404, { success: false, message: 'Ticket not found' });
    }

    await verifyTicketById(ticketId);

    return sendResponse(200, { success: true });
  } catch (error) {
    const awsError = error as AWSError;
    if (awsError?.code === 'ConditionalCheckFailedException') {
      return sendResponse(403, { success: false, message: 'Ticket has already been verified.' });
    }
    return sendResponse(500, { success: false, message: 'Something went wrong, could not verify ticket.' });
  }
};

async function getTicketById(ticketId: string) {
  const { Item } = await db
    .get({
      TableName: 'tickets',
      Key: {
        id: ticketId,
      },
    })
    .promise();

  return Item;
}

async function verifyTicketById(ticketId: string) {
  await db
    .update({
      TableName: 'tickets',
      Key: {
        id: ticketId,
      },
      UpdateExpression: 'SET verified = :newValue',
      ConditionExpression: 'verified = :currentValue',
      ExpressionAttributeValues: {
        ':newValue': true,
        ':currentValue': false,
      },
      ReturnValues: 'ALL_NEW',
    })
    .promise();
}
