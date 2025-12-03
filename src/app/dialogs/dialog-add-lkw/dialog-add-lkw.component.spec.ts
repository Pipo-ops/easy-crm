import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogAddLkwComponent } from './dialog-add-lkw.component';

describe('DialogAddLkwComponent', () => {
  let component: DialogAddLkwComponent;
  let fixture: ComponentFixture<DialogAddLkwComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogAddLkwComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogAddLkwComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
