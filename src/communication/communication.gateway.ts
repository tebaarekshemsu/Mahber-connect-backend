import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // For production, configure the specific origins
  },
})
export class CommunicationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(CommunicationGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_user')
  handleJoinUser(
    @MessageBody() userId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const room = `user_${userId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined room: ${room}`);
    return { event: 'joined_user_room', room };
  }

  @SubscribeMessage('join_mahber')
  handleJoinMahber(
    @MessageBody() mahberId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const room = `mahber_${mahberId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined room: ${room}`);
    return { event: 'joined_mahber_room', room };
  }

  @SubscribeMessage('leave_mahber')
  handleLeaveMahber(
    @MessageBody() mahberId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const room = `mahber_${mahberId}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} left room: ${room}`);
    return { event: 'left_mahber_room', room };
  }
}
