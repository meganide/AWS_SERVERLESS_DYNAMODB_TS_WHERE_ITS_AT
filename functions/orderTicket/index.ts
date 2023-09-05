import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sendResponse } from '../../responses/index.ts';
import { db } from '../../services/db.ts';
import { nanoid } from 'nanoid';
import { AWSError } from 'aws-sdk/lib/error';

export const handler = async (event: APIGatewayProxyEvent, context: APIGatewayProxyResult) => {
  const { eventId } = event.pathParameters;

  try {
    const ticketNumber = nanoid();
    const event = await updateTicketAmount(eventId);
    await createTicket(ticketNumber, eventId);
    return sendResponse(200, { success: true, ticketNumber, event });
  } catch (error) {
    const awsError = error as AWSError;
    if (awsError?.code === 'ConditionalCheckFailedException') {
      return sendResponse(403, { success: false, message: 'Tickets have been sold out.' });
    }
    return sendResponse(500, { success: false, message: 'Something went wrong, could not order ticket.' });
  }
};

async function updateTicketAmount(eventId: string) {
  const {
    Attributes: { id, ticketsLeft, ...event },
  } = await db
    .update({
      TableName: 'events',
      Key: {
        id: eventId,
      },
      UpdateExpression: 'SET ticketsLeft = ticketsLeft - :decrement',
      ExpressionAttributeValues: {
        ':decrement': 1,
        ':zero': 0,
      },
      ConditionExpression: 'ticketsLeft > :zero',
      ReturnValues: 'ALL_NEW',
    })
    .promise();

  return event;
}

async function createTicket(ticketNumber: string, eventId: string) {
  await db
    .put({
      TableName: 'tickets',
      Item: {
        id: ticketNumber,
        eventId,
        verified: false,
      },
    })
    .promise();
}
