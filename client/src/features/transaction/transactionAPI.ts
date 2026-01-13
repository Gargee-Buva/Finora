import { apiClient } from "@/app/api-client";
import { AIScanReceiptResponse, BulkImportTransactionPayload, CreateTransactionBody, GetAllTransactionParams, GetAllTransactionResponse, GetSingleTransactionResponse, UpdateTransactionPayload } from "./transationType";

export const transactionApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    createTransaction: builder.mutation<void, CreateTransactionBody>({
      query: (body) => ({
        url: "/transaction/create",
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["transactions","analytics"],
    }),

    aiScanReceipt: builder.mutation<AIScanReceiptResponse, FormData>({
      query: (formData) => ({
        url: "/transaction/scan-receipt",
        method: "POST",
        body: formData,
      }),
    }),

  getAllTransactions: builder.query<GetAllTransactionResponse, GetAllTransactionParams>({
  query: (params) => {
    const {
      keyword,
      type,
      recurringStatus,
      pageNumber = 1,
      pageSize = 10,
    } = params;

    return {
      url: "/transaction/all",
      method: "GET",
      params: {
        keyword,
        type,
        recurringStatus,
        pageNumber,
        pageSize,
      },
    };
  },

  transformResponse: (response: any): GetAllTransactionResponse => {
    console.log("getAllTransactions response:", response);
    return {
      message: response.message, 
      transactions: response.result.transactions,
      // pagination: {
      //   totalCount: response.result.total,
      //   pageNumber: response.result.pageNumber,
      //   pageSize: response.result.pageSize,
      //   totalPages: Math.ceil(
      //     response.result.total / response.result.pageSize
      //   ),
      //   skip: 0,
      // },
      pagination: response.result.pagination
    };
  },

  //providesTags: ["transactions"],
  providesTags: (_result) => [
    { type: "transactions", id: "LIST" },
    ...(_result?.transactions?.map((t) => ({ type: "transactions" as const, id: t.id })) ?? []),
  ],
}),



    getSingleTransaction: builder.query<GetSingleTransactionResponse, string>({
      query: (id) => ({
        url: `/transaction/${id}`,
        method: "GET",
      }),
    }),

    duplicateTransaction: builder.mutation<void, string>({
      query: (id) => ({
        url: `/transaction/duplicate/${id}`,
        method: "PUT",
      }),
      invalidatesTags: ["transactions"],
    }),

    updateTransaction: builder.mutation<void, UpdateTransactionPayload>({
      query: ({ id, transaction }) => ({
        url: `/transaction/update/${id}`,
        method: "PUT",
        body: transaction,
      }),
      invalidatesTags: ["transactions"],
    }),

    bulkImportTransaction: builder.mutation<void, BulkImportTransactionPayload>(
      {
        query: (body) => ({
          url: "/transaction/bulk",
          method: "POST",
          body,
        }),
        //invalidatesTags: ["transactions"],
          invalidatesTags: (_result, _error, _arg) => [
          { type: "transactions", id: "LIST" },
        ],
      }
    ),

    deleteTransaction: builder.mutation<void, string>({
      query: (id) => ({
        url: `/transaction/delete/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["transactions","analytics"],
    }),

    bulkDeleteTransaction: builder.mutation<void, string[]>({
      query: (transactionIds) => ({
        url: "/transaction/bulk-delete",
        //method: "DELETE",
        method: "POST",
        body: {
          transactionIds,
        },
      }),
      invalidatesTags: ["transactions","analytics"],
    }),
  }),
});

export const {
  useCreateTransactionMutation,
  useGetAllTransactionsQuery,
  useAiScanReceiptMutation,
  useGetSingleTransactionQuery,
  useDuplicateTransactionMutation,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,
  useBulkDeleteTransactionMutation,
  useBulkImportTransactionMutation,
} = transactionApi;
