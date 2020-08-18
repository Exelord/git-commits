import { BaseNode } from './base';

export class TextNode extends BaseNode {
	constructor(public text: string) {
		super(text);
		
		this.contextValue = 'textNode';
	}
}