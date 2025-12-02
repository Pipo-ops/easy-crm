import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogEditLkwComponent } from './dialog-edit-lkw.component';

describe('DialogEditLkwComponent', () => {
  let component: DialogEditLkwComponent;
  let fixture: ComponentFixture<DialogEditLkwComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogEditLkwComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogEditLkwComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
