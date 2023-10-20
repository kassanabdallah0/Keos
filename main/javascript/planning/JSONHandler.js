import ErrorHandler from  './ErrorHandler.js';

export default class JSONHandler {
    constructor(baseURL = '', maxRetries = 3, retryDelay = 1000, timeout = 5000) {
        this.baseURL = baseURL;
        this.maxRetries = maxRetries;
        this.retryDelay = retryDelay;
        this.timeout = timeout;
        this.defaultHeaders = {};
    }

    setDefaultHeaders(headers) {
        if (typeof headers !== 'object') {
            throw new Error('headers must be an object');
        }
        this.defaultHeaders = headers;
    }

  async fetch(resourceUrl, options = {}) {
        const defaultOptions = {
            dataType: 'json',
            method: 'GET',
            headers: this.defaultHeaders,
            timeout: this.timeout
        };

        const requestOptions = { ...defaultOptions, ...options };
        const fullURL = this.baseURL ? `${this.baseURL}${resourceUrl}` : resourceUrl;

        for (let i = 0; i < this.maxRetries; i++) {
            try {
                const response = await $.ajax({
                    url: fullURL,
                    ...requestOptions
                });

                if (response === undefined || response === null) {
                    throw new Error(`Empty response from server.`);
                }

                if (requestOptions.dataType === 'json' && typeof response !== 'object') {
                    throw new Error(`Expected JSON response but received ${typeof response}`);
                }

                return response;

            } catch (error) {
                if (i === this.maxRetries - 1) {
                    throw new Error(`Failed to fetch from ${fullURL} after ${this.maxRetries} attempts. Error: ${error.message}`);
                }
                if (error.statusText === 'timeout') {
                    console.warn(`Request timed out. Retrying...`);
                    requestOptions.timeout += this.retryDelay; // Increase timeout for each retry
                } else {
                    console.warn(`Attempt ${i + 1} failed. Retrying in ${this.retryDelay}ms... Error: ${error.message}`);
                }
                await new Promise(res => setTimeout(res, this.retryDelay)); // Wait before retrying
            }
        }
    }
}
