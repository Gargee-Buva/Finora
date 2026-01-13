import mongoose , { Schema, Document } from "mongoose";    
import { convertToPaise, convertToRupees } from "../utils/format-currency.js";

export enum TransactionStatusEnum {
    PENDING = "Pending",
    COMPLETED = "Completed",
    FAILED = "Failed"
}

export enum RecurringIntervalEnum {
    NONE = "none",
    DAILY = "daily",
    WEEKLY = "weekly",
    MONTHLY = "monthly",
    YEARLY = "yearly"
}

export enum TransactionTypeEnum {
    INCOME = "Income",
    EXPENSE = "Expense",
}

export enum PaymentMethodEnum {
  CASH = "Cash",
  CARD = "Card",
  UPI = "UPI",
  BANK_TRANSFER = "Bank Transfer",
}




export interface TransactionDocument extends Document {
    userId: mongoose.Types.ObjectId;
    type: keyof typeof TransactionTypeEnum;
    title: string;
    amount: number;
    category: string;
    receiptUrl?: string;
    recurringInterval: keyof typeof RecurringIntervalEnum;
    nextRecurrenceDate?: Date;
    lastProcessedDate?: Date;
    isRecurring: boolean;
    description?: string;
    date: Date;
    status:  TransactionStatusEnum;     //keyof typeof TransactionStatusEnum;
    paymentMethod:  PaymentMethodEnum; //keyof typeof PaymentMethodEnum;
    createdAt: Date;
    updatedAt: Date;
}

const transactionSchema = new Schema<TransactionDocument>({
    userId: { 
        type: Schema.Types.ObjectId, 
        ref: 'User',
        required: true 
    },
    title: {
        type: String,
        required: true,
    },

    type: { 
        type: String, 
        enum: Object.values(TransactionTypeEnum),
        required: true
    },

    amount : {
        type: Number,
        required: true,
        set : (value: number) => convertToPaise(value), // Store amount in paise
        get : (value: number) => convertToRupees(value), // Retrieve amount in rupees
    },

    category: { 
        type: String, 
        required: true,
    },

    description: { 
        type: String,
    },

    receiptUrl: { 
        type: String,
    },

    date: { 
        type: Date, 
        default: Date.now, 
    },

    isRecurring: { 
        type: Boolean, 
        default: false 
    },

    recurringInterval: { 
        type: String, 
        enum: Object.values(RecurringIntervalEnum),
        default: null,
    },

    nextRecurrenceDate: {
        type: Date,
    },

    lastProcessedDate: {
        type: Date,
        default: null,
    },

    status: { 
        type: String, 
        enum: Object.values(TransactionStatusEnum) as string[],
        default: TransactionStatusEnum.COMPLETED,
    },

    paymentMethod: { 
        type: String, 
        enum: Object.values(PaymentMethodEnum),
        default: PaymentMethodEnum.CASH,
    },

}, { 
    timestamps: true,
    toJSON: { virtuals: true , getters: true }, // Enable getters when converting to JSON
    toObject: { virtuals: true , getters: true } // Enable getters when converting to Object
}
);

// ensure this is placed after the schema is defined, before model creation
// transactionSchema.index(
//   { userId: 1, title: 1, amount: 1, date: 1 },
//   { unique: true, name: "unique_user_title_amount_date" }
// );


// const TransactionModel = mongoose.model<TransactionDocument>("Transaction", transactionSchema);
// export default TransactionModel;
const TransactionModel = mongoose.model<TransactionDocument>(
  "Transaction",
  transactionSchema
);

export default TransactionModel;
