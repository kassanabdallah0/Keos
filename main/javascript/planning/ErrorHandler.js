export default class ErrorHandler {
    static handleError(context, message, error) {
        console.error(`[${context}] ${message}:`, error.message);
        // Maybe display a user-friendly message on the UI if needed.
    }
}