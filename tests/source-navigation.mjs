import assert from 'node:assert/strict';
import {sourcePageFor,sectionForSourcePage,sectionsForSourcePage} from '../public/src/source-navigation.mjs';
const book={spine:[{href:'a',section_id:'pg008_sec001',page_number:8},{href:'b',section_id:'pg008_sec002'},{href:'c',section_id:'pg009_sec001'},{href:'quiz',section_id:'qz001'}],mappings:{},design:{sections:[{href:'quiz',sourcePage:8}]}};
assert.deepEqual(sectionsForSourcePage(book,8,20),[0,1,3]);assert.equal(sectionForSourcePage(book,8,1,20),1);assert.equal(sectionForSourcePage(book,8,2,20),0);assert.equal(sectionForSourcePage(book,4,1,20),-1);
book.design.sections.push({href:'a',sourcePage:10});assert.equal(sourcePageFor(book,book.spine[0],20),10);book.mappings.a={page:12,confirmed:true};assert.equal(sourcePageFor(book,book.spine[0],20),12);assert.equal(sectionForSourcePage(book,12,2,20),0);assert.equal(sourcePageFor(book,book.spine[0],11),null);
for(const value of [0,-1,1.5,'bad',Infinity]){book.mappings.a.page=value;assert.equal(sourcePageFor(book,book.spine[0],20),null);}
assert.equal(sourcePageFor(book,null,20),null);assert.equal(sourcePageFor(book,{href:'unknown',section_id:'qz002'},20),null);console.log('Source navigation: shared pages, quizzes, explicit offsets, unavailable pages, and invalid mappings passed.');
