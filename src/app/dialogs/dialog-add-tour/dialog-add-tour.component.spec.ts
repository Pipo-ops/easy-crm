import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogAddTourComponent } from './dialog-add-tour.component';

describe('DialogAddTourComponent', () => {
  let component: DialogAddTourComponent;
  let fixture: ComponentFixture<DialogAddTourComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogAddTourComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogAddTourComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
