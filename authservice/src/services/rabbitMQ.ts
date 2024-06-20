import {ConsumeMessage} from "amqplib";
import UserTarget from "../models/userTarget";
import UserSubmission from "../models/userSubmission";
import {newSubmissionKey, newTargetKey} from "../router/authRouter";

export interface NewTargetMessage {
    targetId: number;
    userId: string;
}

export interface NewSubmissionMessage {
    submissionId: number;
    userId: string;
}

export const onMessage = async (msg: ConsumeMessage) => {
    console.log('Received message');
    if (msg === null) {
        return;
    }
    console.log(`Received message: ${msg.content.toString()}`);
    const queueMessage: NewTargetMessage | NewSubmissionMessage = JSON.parse(msg.content.toString());
    switch (msg.fields.routingKey) {
        case newTargetKey:
            const newTargetMessage = queueMessage as NewTargetMessage;
            await UserTarget.create({
                targetId: newTargetMessage.targetId,
                userId: newTargetMessage.userId
            }).then(() => {
                console.log('User target created');
            });
            break;
        case newSubmissionKey:
            const newSubmissionMessage = queueMessage as NewSubmissionMessage;
            await UserSubmission.create({
                submissionId: newSubmissionMessage.submissionId,
                userId: newSubmissionMessage.userId
            }).then(() => {
                console.log('User submission created');
            });
            break;
    }
}

