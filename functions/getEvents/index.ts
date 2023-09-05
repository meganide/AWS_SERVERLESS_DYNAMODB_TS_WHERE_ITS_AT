import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sendResponse } from '../../responses/index.ts';
import { db } from '../../services/db.ts';

export const handler = async (event: APIGatewayProxyEvent, context: APIGatewayProxyResult) => {
  try {
    const events = await getAllEvents();
    return sendResponse(200, events);
  } catch (error) {
    return sendResponse(500, { success: false, message: 'Something went wrong, could not get any events.' });
  }
};

async function getAllEvents() {
  const { Items } = await db
    .scan({
      TableName: 'events',
      ProjectionExpression: 'id, arena, artist, #d, price, #t, ticketsLeft',
      ExpressionAttributeNames: { '#d': 'date', '#t': 'time' },
    })
    .promise();

  return Items;
}
