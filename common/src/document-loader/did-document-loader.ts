import { DataBaseHelper } from '../helpers';
import { DidDocument } from '../entity';
import { DidURL, DocumentLoader, IDocumentFormat } from '../hedera-modules';

/**
 * DID Documents Loader
 * Used for signatures validation.
 */
export class DIDDocumentLoader extends DocumentLoader {
    /**
     * Get formatted document
     * @param iri
     */
    public async get(iri: string): Promise<IDocumentFormat> {
        return {
            documentUrl: iri,
            document: await this.getDocument(iri)
        };
    }

    /**
     * Get document
     * @param iri
     */
    public async getDocument(iri: string): Promise<any> {
        const did = DidURL.getController(iri);
        const didDocuments = await new DataBaseHelper(DidDocument).findOne({ did });
        if (didDocuments) {
            return didDocuments.document;
        }
        throw new Error(`DID not found: ${iri}`);
    }
}
