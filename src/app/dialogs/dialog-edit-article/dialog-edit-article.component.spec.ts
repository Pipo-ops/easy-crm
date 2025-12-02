import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogEditArticleComponent } from './dialog-edit-article.component';

describe('DialogEditArticleComponent', () => {
  let component: DialogEditArticleComponent;
  let fixture: ComponentFixture<DialogEditArticleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogEditArticleComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogEditArticleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
